import { useState } from "react";
import {
  CORES_DESENHO, ESPESSURAS, FIBO_NIVEIS_DISPONIVEIS, FIBO_NIVEIS_FIXOS,
  FONTES, TAMANHOS, normalizarNiveisFibo, rotuloDaFerramenta,
} from "../../lib/grafico/estiloDesenho.js";

/**
 * TRADEZEN — PAINEL DE PERSONALIZAÇÃO DO DESENHO
 * ==============================================
 *
 * Aparece coladinho na barra de ferramentas quando uma ferramenta está
 * armada, e some quando ela é largada. Mostra só o que aquela ferramenta
 * tem: o texto ganha fonte e tamanho, o Fibonacci ganha a lista de
 * níveis, as linhas ficam com cor, espessura e traço.
 *
 * O que muda aqui vale pros desenhos NOVOS. Mexer na cor padrão não
 * repinta o que já está no gráfico — quem marcou um suporte em vermelho
 * ontem espera encontrá-lo vermelho hoje.
 */

const TRACOS_VISIVEIS = [
  { id: "solido", rotulo: "Sólido", risco: "———" },
  { id: "tracejado", rotulo: "Tracejado", risco: "– – –" },
  { id: "pontilhado", rotulo: "Pontilhado", risco: "· · ·" },
];

function Cores({ cor, aoEscolher }) {
  const personalizada = !CORES_DESENHO.some((c) => c.valor.toLowerCase() === (cor || "").toLowerCase());
  return (
    <div className="pp-linha">
      <span className="pp-rotulo">Cor</span>
      <div className="pp-cores">
        {CORES_DESENHO.map((c) => (
          <button
            key={c.valor}
            type="button"
            title={c.nome}
            aria-label={c.nome}
            aria-pressed={c.valor.toLowerCase() === (cor || "").toLowerCase()}
            className={`pp-cor ${c.valor.toLowerCase() === (cor || "").toLowerCase() ? "ativa" : ""}`}
            style={{ background: c.valor }}
            onClick={() => aoEscolher(c.valor)}
          />
        ))}
        {/* O conta-gotas do próprio navegador: quem quer um tom que não
            está na paleta não fica preso a ela. */}
        <label className={`pp-cor pp-cor-custom ${personalizada ? "ativa" : ""}`} title="Outra cor">
          <input type="color" value={cor || "#4F8AE8"} onChange={(e) => aoEscolher(e.target.value)} />
          <span aria-hidden="true">+</span>
        </label>
      </div>
    </div>
  );
}

function Niveis({ niveis, aoMudar }) {
  const ativos = normalizarNiveisFibo(niveis);
  return (
    <div className="pp-linha pp-linha-col">
      <span className="pp-rotulo">Níveis</span>
      <div className="pp-niveis">
        {FIBO_NIVEIS_DISPONIVEIS.map((n) => {
          const fixo = FIBO_NIVEIS_FIXOS.includes(n);
          const ligado = ativos.includes(n);
          return (
            <button
              key={n}
              type="button"
              disabled={fixo}
              // 0% e 100% são as pontas do movimento: sem elas o desenho
              // perde a referência do que está sendo medido
              title={fixo ? "As pontas do movimento sempre aparecem" : undefined}
              aria-pressed={ligado}
              className={`pp-nivel ${ligado ? "ativo" : ""} ${fixo ? "fixo" : ""}`}
              onClick={() => aoMudar(ligado ? ativos.filter((x) => x !== n) : [...ativos, n])}
            >
              {(n * 100).toFixed(1).replace(".0", "")}%
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PainelPersonalizacao({ ferramenta, estilo, aoMudar }) {
  const [recolhido, setRecolhido] = useState(false);
  if (!ferramenta || !estilo) return null;

  const eTexto = ferramenta === "texto";
  const eFibo = ferramenta === "fibo";

  return (
    <div className="pp" role="group" aria-label={`Estilo — ${rotuloDaFerramenta(ferramenta)}`}>
      <div className="pp-topo">
        <strong>{rotuloDaFerramenta(ferramenta)}</strong>
        <button
          type="button"
          className="pp-recolher"
          onClick={() => setRecolhido((v) => !v)}
          aria-expanded={!recolhido}
          title={recolhido ? "Mostrar opções" : "Recolher"}
        >{recolhido ? "▸" : "▾"}</button>
      </div>

      {!recolhido && (
        <div className="pp-corpo">
          <Cores cor={estilo.cor} aoEscolher={(cor) => aoMudar({ cor })} />

          {eTexto ? (
            <>
              <div className="pp-linha">
                <span className="pp-rotulo">Fonte</span>
                <select
                  className="pp-select"
                  value={estilo.fonte}
                  onChange={(e) => aoMudar({ fonte: e.target.value })}
                  aria-label="Fonte do texto"
                >
                  {FONTES.map((f) => <option key={f.valor} value={f.valor}>{f.nome}</option>)}
                </select>
              </div>
              <div className="pp-linha">
                <span className="pp-rotulo">Tamanho</span>
                <select
                  className="pp-select pp-select-curto"
                  value={estilo.tamanho}
                  onChange={(e) => aoMudar({ tamanho: Number(e.target.value) })}
                  aria-label="Tamanho do texto"
                >
                  {TAMANHOS.map((t) => <option key={t} value={t}>{t}px</option>)}
                </select>
                <button
                  type="button"
                  className={`pp-bi ${estilo.negrito ? "ativo" : ""}`}
                  aria-pressed={estilo.negrito}
                  title="Negrito"
                  onClick={() => aoMudar({ negrito: !estilo.negrito })}
                ><strong>B</strong></button>
                <button
                  type="button"
                  className={`pp-bi ${estilo.italico ? "ativo" : ""}`}
                  aria-pressed={estilo.italico}
                  title="Itálico"
                  onClick={() => aoMudar({ italico: !estilo.italico })}
                ><em>I</em></button>
              </div>
            </>
          ) : (
            <>
              <div className="pp-linha">
                <span className="pp-rotulo">Espessura</span>
                <div className="pp-grupo">
                  {ESPESSURAS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      title={`${e}px`}
                      aria-label={`Espessura ${e} pixels`}
                      aria-pressed={estilo.espessura === e}
                      className={`pp-esp ${estilo.espessura === e ? "ativo" : ""}`}
                      onClick={() => aoMudar({ espessura: e })}
                    >
                      <i style={{ height: e }} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="pp-linha">
                <span className="pp-rotulo">Traço</span>
                <div className="pp-grupo">
                  {TRACOS_VISIVEIS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      title={t.rotulo}
                      aria-label={t.rotulo}
                      aria-pressed={estilo.traco === t.id}
                      className={`pp-traco ${estilo.traco === t.id ? "ativo" : ""}`}
                      onClick={() => aoMudar({ traco: t.id })}
                    >{t.risco}</button>
                  ))}
                </div>
              </div>
              {eFibo && <Niveis niveis={estilo.niveis} aoMudar={(niveis) => aoMudar({ niveis })} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}
