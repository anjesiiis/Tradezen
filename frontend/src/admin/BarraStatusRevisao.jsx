import { STATUS_DE_CLIQUE, proximoStatus } from "./statusRevisao.js";
import SeletorQualidade from "./SeletorQualidade.jsx";

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
 *
 * A QUALIDADE DA FORMA entra aqui embaixo, e não numa barra própria em
 * outro canto: são os dois julgamentos que se faz sobre a mesma
 * marcação, com a mesma marcação na frente. Separados, dar as duas notas
 * exigiria descer e subir a tela. Só aparece quando a tela passa
 * `qualidade`/`aoMudarQualidade` — as telas que não têm a feature ficam
 * como antes.
 */
export default function BarraStatusRevisao({
  titulo, subtitulo, status, aoMudar, aoFechar, indisponivel = false,
  motivo = null, aoTentarDeNovo = null,
  // Qualidade: opcional. `qualidade` é 0–4 ou null (ninguém avaliou).
  qualidade = undefined, aoMudarQualidade = null,
  qualidadeIndisponivel = false, qualidadeMotivo = null,
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
        // Não há onde gravar. Botão que não grava é pior que botão nenhum:
        // diz o que falta, em vez de aceitar o clique e perder a marcação
        // em silêncio.
        //
        // O motivo vem de quem tentou (ver useStatusRevisao): pode ser a
        // migration que falta OU o servidor fora de alcance, e os dois
        // pedem providências opostas. Antes dizia "falta a migration" nos
        // dois casos, o que mandava consertar o que já estava certo.
        <div className="sr-indisponivel">
          <span>{motivo || "Status de revisão indisponível."}</span>
          {aoTentarDeNovo && (
            <button type="button" className="sr-tentar" onClick={aoTentarDeNovo}>
              Tentar de novo
            </button>
          )}
        </div>
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

      {aoMudarQualidade && (
        <SeletorQualidade
          qualidade={qualidade ?? null}
          aoMudar={aoMudarQualidade}
          indisponivel={qualidadeIndisponivel}
          motivo={qualidadeMotivo}
        />
      )}
    </div>
  );
}
