import { useEffect, useState } from "react";
import { SearchBar } from "./SearchBar.jsx";

/**
 * TRADEZEN — ADICIONAR UMA MESA
 * =============================
 *
 * O "+" abria uma mesa nova com o MESMO ativo, sempre. Serve pra comparar
 * dois tempos do mesmo papel — mas quem queria olhar outro ativo tinha
 * que abrir a mesa e trocar o ticker dentro dela, o que não é óbvio.
 * Agora a escolha é feita antes, com as duas intenções no mesmo lugar.
 */

// Qual tempo sugerir pra segunda mesa do mesmo ativo: sempre um degrau
// mais de perto, que é o uso real (ver o diário e o intraday lado a lado).
// Do 1m, o único lugar pra ir é pra trás.
const MAIS_PERTO = { "1S":"1D", "1D":"60m", "60m":"15m", "15m":"5m", "5m":"1m", "1m":"15m" };

export function tempoSugerido(atual) {
  return MAIS_PERTO[atual] || "60m";
}

export default function ModalAdicionarGrafico({ ticker, simbolo, tempoAtual, mercado = [], aoFechar, aoEscolher }) {
  const [buscando, setBuscando] = useState(false);

  // Esc fecha — em qualquer um dos dois passos.
  useEffect(() => {
    const tecla = (e) => { if (e.key === "Escape") { e.stopPropagation(); aoFechar?.(); } };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aoFechar]);

  const sugerido = tempoSugerido(tempoAtual);

  return (
    <div className="mag-fundo" onMouseDown={aoFechar} role="presentation">
      <div
        className="mag-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mag-titulo"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mag-topo">
          <h3 id="mag-titulo">{buscando ? "Escolher outro ativo" : "Adicionar uma mesa"}</h3>
          <button className="mag-fechar" onClick={aoFechar} aria-label="Fechar">✕</button>
        </div>

        {buscando ? (
          <div className="mag-busca">
            <SearchBar
              mercado={mercado}
              autoFoco
              onSelect={(a) => aoEscolher?.({ ticker: a.ticker })}
            />
            <button className="mag-voltar" onClick={() => setBuscando(false)}>← Voltar</button>
          </div>
        ) : (
          <div className="mag-opcoes">
            <button className="mag-opcao" onClick={() => aoEscolher?.({ ticker, tempo: sugerido })}>
              <span className="mag-icone" aria-hidden="true">📊</span>
              <span className="mag-titulo">Mesmo ativo</span>
              <span className="mag-desc">
                Ver <strong>{simbolo || ticker}</strong> em outro tempo, lado a lado — abre em <strong>{sugerido}</strong>.
              </span>
              <span className="mag-cta">Adicionar</span>
            </button>

            <button className="mag-opcao" onClick={() => setBuscando(true)}>
              <span className="mag-icone" aria-hidden="true">🔍</span>
              <span className="mag-titulo">Outro ativo</span>
              <span className="mag-desc">
                Procurar ação, moeda, cripto, commodity ou índice.
              </span>
              <span className="mag-cta">Buscar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
