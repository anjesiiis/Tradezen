import { useEffect, useState } from "react";
import { ICONE_GENERICO, classeDoPadrao, iconeDoPadrao } from "../lib/iconesPadroes.js";
import { PADROES_DO_FILTRO, guardarFiltro } from "../lib/filtroPadroes.js";

// Sidebar do gráfico de marcação: escolhe quais padrões já salvos ficam
// visíveis no gráfico e lista os que existem neste ativo. Começa com tudo
// que já existe ligado — abrir um ativo mostra na hora o que foi marcado
// nele; o analista desliga o que atrapalhar.
//
// A escolha fica no localStorage: quem usa isso passa horas marcando, e
// refazer a seleção a cada recarga seria trabalho repetido à toa.

/**
 * @param {string[]} ligados — ids marcados
 * @param {(ids: string[]) => void} aoMudar
 * @param {Record<string, number>} contagem — quantos salvos há por padrão
 *        neste ativo (opcional, só pra informar)
 * @param {Array} salvos — marcadores dos templates deste ativo (lampadas.js):
 *        viram a lista "Marcados neste ativo", cada item abrindo em modo ver
 * @param {number|null} destacado — id do template salvo agora, pra piscar
 * @param {Set<string>} foraDaFaixa — ids que não cabem no período carregado:
 *        ficam na lista, apagados, porque no gráfico eles não aparecem
 */
// UTC: o candle é do dia inteiro; o fuso local jogaria a data um dia atrás
function formatarData(data) {
  if (!data) return "—";
  const d = new Date(data);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function rotuloDoResultado(resultado) {
  const r = (resultado || "").toLowerCase();
  if (r.startsWith("suc")) return "Sucesso";
  if (r.startsWith("fal")) return "Falha";
  return "Indefinido";
}

function classeDoResultado(resultado) {
  const r = (resultado || "").toLowerCase();
  if (r.startsWith("suc")) return "sucesso";
  if (r.startsWith("fal")) return "falha";
  return "indefinido";
}

export default function FiltroPadroes({ ligados, aoMudar, contagem = {}, salvos = [], destacado = null, foraDaFaixa = new Set() }) {
  const [abertoNoCelular, setAberto] = useState(false);

  useEffect(() => { guardarFiltro(ligados); }, [ligados]);

  function alternar(id) {
    aoMudar(ligados.includes(id) ? ligados.filter((x) => x !== id) : [...ligados, id]);
  }

  const total = ligados.length;

  return (
    <aside className={`filtro-padroes${abertoNoCelular ? " aberto" : ""}`}>
      <button
        type="button"
        className="filtro-padroes-titulo"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={abertoNoCelular}
      >
        Padrões {total > 0 && <span className="filtro-padroes-contador">{total}</span>}
      </button>

      <div className="filtro-padroes-lista">
        {PADROES_DO_FILTRO.map((p) => {
          const marcado = ligados.includes(p.id);
          const quantos = contagem[p.id] || 0;
          return (
            <label
              key={p.id}
              className={`filtro-padrao${p.emBreve ? " em-breve" : ""}`}
              title={p.emBreve ? "Ainda não existe no detector" : `${p.nome}${quantos ? ` · ${quantos} marcado(s) neste ativo` : ""}`}
            >
              <input
                type="checkbox"
                checked={marcado}
                disabled={p.emBreve}
                onChange={() => alternar(p.id)}
              />
              <span className={`filtro-padrao-icone ${classeDoPadrao(p.id)}`} aria-hidden="true">
                {p.emBreve ? ICONE_GENERICO : iconeDoPadrao(p.id)}
              </span>
              <span className="filtro-padrao-nome">{p.nome}</span>
              {p.emBreve
                ? <span className="filtro-tag">(em breve)</span>
                : quantos > 0 && <span className="filtro-quantos">{quantos}</span>}
            </label>
          );
        })}
      </div>

      {total > 0 && (
        <button type="button" className="filtro-padroes-limpar" onClick={() => aoMudar([])}>
          Desmarcar todos
        </button>
      )}

      {salvos.length > 0 && (
        <>
          <span className="filtro-secao">Marcados neste ativo</span>
          <div className="filtro-salvos">
            {/* mais recente primeiro: o que acabou de ser salvo fica no topo */}
            {[...salvos]
              .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))
              .map((m) => (
                <a
                  key={m.id}
                  className={`filtro-salvo${destacado === m.templateId ? " novo" : ""}${foraDaFaixa.has(m.id) ? " fora" : ""}`}
                  href={m.rota ? `${m.rota}?modo=visualizar&id=${m.templateId}` : undefined}
                  title={foraDaFaixa.has(m.id)
                    ? `${m.rotulo} de ${formatarData(m.data)} — fora do período carregado; aumente o período pra ver no gráfico`
                    : `Ver ${m.rotulo} de ${formatarData(m.data)}`}
                >
                  <span className={`filtro-salvo-icone ${m.classe || classeDoPadrao(m.tipo)}`} aria-hidden="true">{m.icone}</span>
                  <span className="filtro-salvo-texto">
                    <strong>{m.rotulo}</strong>
                    <span>{formatarData(m.data)}</span>
                  </span>
                  <span className={`filtro-salvo-resultado ${classeDoResultado(m.resultado)}`}>
                    {rotuloDoResultado(m.resultado)}
                  </span>
                </a>
              ))}
          </div>
        </>
      )}
    </aside>
  );
}
