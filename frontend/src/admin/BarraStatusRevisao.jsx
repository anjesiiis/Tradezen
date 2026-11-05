import { STATUS_DE_CLIQUE, proximoStatus } from "./statusRevisao.js";

/**
 * Os três status no topo do visualizador, mais o ✕ discreto no canto.
 *
 * GRUPO DE RÁDIO, não três caixinhas: os três são mutuamente exclusivos —
 * uma marcação está num pé só. Caixinha que desmarca as outras ao ser
 * marcada mente sobre o que é, e quem navega por teclado ou leitor de
 * tela recebe a mentira primeiro ("caixa de seleção, não marcada" pra uma
 * coisa que é escolha única). Com role="radio" + aria-checked, o leitor
 * anuncia "opção 2 de 3" e as setas do teclado andam entre elas.
 *
 * O ✕ sai da fila dos status de propósito: fechar não é um status, e
 * deixá-lo junto fazia dele o botão mais fácil de acertar por engano
 * logo ao lado de "Revisto".
 */
export default function BarraStatusRevisao({
  titulo, subtitulo, status, aoMudar, aoFechar, indisponivel = false,
}) {
  function aoTeclar(e, i) {
    const passo = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const n = STATUS_DE_CLIQUE.length;
    const alvo = STATUS_DE_CLIQUE[(i + passo + n) % n];
    aoMudar(proximoStatus(status, alvo.id));
  }

  return (
    <div className="sr-barra">
      <div className="sr-info">
        <h2 className="sr-titulo">{titulo}</h2>
        {subtitulo && <p className="sr-sub">{subtitulo}</p>}
      </div>

      {indisponivel ? (
        // Sem a migration 025 não há onde gravar. Botão que não grava é
        // pior que botão nenhum: diz o que falta, em vez de aceitar o
        // clique e perder a marcação em silêncio.
        <p className="sr-indisponivel" title="backend/sql/025_status_revisao.sql">
          Status de revisão indisponível — falta rodar a migration 025
        </p>
      ) : (
        <div className="sr-grupo" role="radiogroup" aria-label="Status da revisão">
          {STATUS_DE_CLIQUE.map((s, i) => {
            const aceso = status === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={aceso}
                // Só o aceso entra na ordem do Tab; as setas andam entre
                // eles. É como um grupo de rádio se comporta de verdade.
                tabIndex={aceso || (!status && i === 0) ? 0 : -1}
                className={`sr-chip ${s.id}${aceso ? " aceso" : ""}`}
                title={s.dica}
                onClick={() => aoMudar(proximoStatus(status, s.id))}
                onKeyDown={(e) => aoTeclar(e, i)}
              >
                <span aria-hidden="true" className="sr-chip-marca">{s.marca}</span>
                {s.rotulo}
              </button>
            );
          })}
        </div>
      )}

      <button type="button" className="sr-fechar" onClick={aoFechar} aria-label="Fechar">✕</button>
    </div>
  );
}
