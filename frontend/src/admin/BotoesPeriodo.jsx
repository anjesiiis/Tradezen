import { PERIODOS_RAPIDOS } from "../lib/periodosGrafico.js";

// Atalhos de quanto histórico carregar. Trocam o período e já recarregam —
// um clique em vez de escolher no seletor e apertar "Carregar gráfico".
export default function BotoesPeriodo({ valor, aoEscolher, desabilitado }) {
  return (
    <div className="periodo-botoes" role="group" aria-label="Período do gráfico">
      {PERIODOS_RAPIDOS.map((p) => (
        <button
          key={p.valor}
          type="button"
          className={`periodo-botao${valor === p.valor ? " ativo" : ""}`}
          aria-pressed={valor === p.valor}
          disabled={desabilitado}
          onClick={() => aoEscolher(p.valor)}
        >
          {p.rotulo}
        </button>
      ))}
    </div>
  );
}
