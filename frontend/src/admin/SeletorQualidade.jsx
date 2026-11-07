import { NIVEIS, TOTAL_DE_ESTRELAS, estrelasCheias, nivelDe, proximaQualidade } from "./qualidade.js";
import Estrelas from "./Estrelas.jsx";

/**
 * Os cinco níveis de qualidade, no topo do visualizador.
 *
 * GRUPO DE RÁDIO, igual à barra de status e pelo mesmo motivo: uma
 * marcação tem uma nota só. Caixinha que desmarca as outras mente sobre
 * o que é, e quem usa teclado ou leitor de tela recebe a mentira
 * primeiro.
 *
 * As estrelas carregam o nível sem depender de cor: 5 de 5 cheias é
 * Ótimo, 1 de 5 é Falha. Quem não distingue os tons conta e sabe. São
 * `aria-hidden` porque o rótulo já diz o nome do nível — um leitor de
 * tela lendo "estrela estrela estrela" antes de "Alta" só atrasa.
 *
 * NÃO desabilita os botões enquanto grava. A gravação é otimista (ver
 * useQualidade): desabilitar daria um piscar de botão morto a cada
 * clique, e o Render dorme — avaliar quinze marcações seguidas viraria
 * quinze esperas.
 */
export default function SeletorQualidade({ qualidade, aoMudar, indisponivel = false, motivo = null }) {
  function aoTeclar(e, i) {
    const passo = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const n = NIVEIS.length;
    aoMudar(NIVEIS[(i + passo + n) % n].valor);
  }

  if (indisponivel) {
    // Botão que não grava é pior que botão nenhum: aceitaria o clique e
    // perderia a avaliação em silêncio.
    return (
      <div className="sq-indisponivel">
        {motivo || "Qualidade da marcação indisponível."}
      </div>
    );
  }

  const atual = nivelDe(qualidade);

  return (
    <div className="sq-bloco">
      <div className="sq-cabeca">
        <span className="sq-label">Qualidade da forma</span>
        {/* A dica do nível aceso fica aqui, visível, e não só num
            tooltip: quem avalia 212 marcações seguidas precisa do
            critério na frente, não a cada passada de mouse. */}
        <span className="sq-dica">{atual ? atual.dica : "Ainda sem nota"}</span>
      </div>

      <div className="sq-grupo" role="radiogroup" aria-label="Qualidade da forma">
        {NIVEIS.map((n, i) => {
          const aceso = qualidade === n.valor;
          return (
            <button
              key={n.valor}
              type="button"
              role="radio"
              aria-checked={aceso}
              tabIndex={aceso || (qualidade === null && i === 0) ? 0 : -1}
              className={`sq-chip${aceso ? " aceso" : ""}`}
              style={{ "--sq-cor": n.cor }}
              title={n.dica}
              onClick={() => aoMudar(proximaQualidade(qualidade, n.valor))}
              onKeyDown={(e) => aoTeclar(e, i)}
            >
              <Estrelas cheias={estrelasCheias(n.valor)} total={TOTAL_DE_ESTRELAS} />
              <span className="sq-rotulo">{n.rotulo}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
