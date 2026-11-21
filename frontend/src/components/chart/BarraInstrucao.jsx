import { FERRAMENTA_INFO } from "../../lib/grafico/desenhos.js";

/**
 * TRADEZEN — A DICA DA FERRAMENTA ARMADA
 * ======================================
 *
 * Diz onde clicar enquanto um desenho está sendo feito, e muda a cada
 * ponto marcado. O texto vem do FERRAMENTA_INFO, que é o mesmo lugar de
 * onde sai o número de pontos de cada ferramenta — dica e máquina de
 * estados lendo da mesma fonte é o que impede a barra de pedir o "2º
 * ponto" de uma ferramenta que só tem um.
 *
 * O BUG QUE ISTO CONSERTA: a barra ficava no topo central do gráfico,
 * certo, mas SEM pointer-events:none. Ela é desenhada em cima dos
 * candles, então o clique que a pessoa dava num candle debaixo da barra
 * morria nela — a ferramenta ficava armada, a dica continuava pedindo o
 * ponto, e nada acontecia. Era pior que cobrir: cobria E engolia.
 *
 * Agora o invólucro não recebe ponteiro nenhum (o clique atravessa pros
 * candles) e só o ✕ volta a receber. O texto fica ilegível a cliques de
 * propósito: selecionar a dica no meio de um desenho não serve pra nada,
 * e com pointer-events ligado nele o problema voltaria no texto.
 *
 * Fica no TOPO e não no centro: no centro é onde estão os candles que a
 * pessoa precisa ver pra escolher o ponto. E dentro do gráfico, não
 * `fixed` na janela — no multichart cada mesa tem a sua, e uma barra na
 * janela apareceria uma vez só, sem dizer de qual gráfico ela fala.
 */
export default function BarraInstrucao({ ferramenta, pontosMarcados = 0, aoCancelar }) {
  const info = ferramenta ? FERRAMENTA_INFO[ferramenta] : null;
  if (!info) return null;

  // Sem texto pra esta etapa não se inventa um: "Toque no gráfico" é o
  // que vale pra qualquer ferramenta cujo hint acabou antes dos pontos.
  const texto = info.hints[pontosMarcados] || "Toque no gráfico…";

  return (
    <div className="barra-dica-wrap">
      <div className="barra-dica">
        <span className="barra-dica-texto">{texto}</span>
        <button
          type="button"
          className="barra-dica-x"
          onClick={aoCancelar}
          title="Cancelar"
          aria-label="Cancelar ferramenta"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
