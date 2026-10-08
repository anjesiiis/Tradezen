import { useEffect, useState } from "react";
import { ICONE_GENERICO, iconeDoPadrao } from "../lib/iconesPadroes.js";
import { PADROES_DO_FILTRO, guardarFiltro } from "../lib/filtroPadroes.js";

// Sidebar do gráfico de marcação: escolhe quais padrões já salvos ficam
// visíveis. Começa tudo desmarcado — a tela abre limpa, e o analista liga
// só o que quer conferir antes de marcar.
//
// A escolha fica no localStorage: quem usa isso passa horas marcando, e
// refazer a seleção a cada recarga seria trabalho repetido à toa.

/**
 * @param {string[]} ligados — ids marcados
 * @param {(ids: string[]) => void} aoMudar
 * @param {Record<string, number>} contagem — quantos salvos há por padrão
 *        neste ativo (opcional, só pra informar)
 */
export default function FiltroPadroes({ ligados, aoMudar, contagem = {} }) {
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
              <span className="filtro-padrao-icone" aria-hidden="true">
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
    </aside>
  );
}
