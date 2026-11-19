import { useEffect } from "react";
import { SearchBar } from "./SearchBar.jsx";

/**
 * TRADEZEN — ADICIONAR UMA MESA
 * =============================
 *
 * O "+" abre direto a busca de ativos. Antes havia um passo intermediário
 * com duas opções, "Mesmo ativo" e "Outro ativo", e ele saiu por pedido
 * do dono: duas intenções numa tela fazem a pessoa escolher antes de
 * poder fazer o que veio fazer, e abrir outro ativo é o que se quer na
 * esmagadora maioria das vezes.
 *
 * Quem quer o MESMO papel em outro tempo não perdeu nada: basta buscar o
 * mesmo ticker e trocar o tempo na mesa nova, que é um clique na barra
 * dela — e o tempo de cada mesa já é guardado na bancada.
 */
export default function ModalAdicionarGrafico({ mercado = [], aoFechar, aoEscolher }) {
  // Esc fecha. `stopPropagation` porque a tela do gráfico também escuta
  // Esc (pra sair de ferramenta de desenho), e as duas reagindo ao mesmo
  // toque fariam o Esc fechar o modal E cancelar o desenho atrás dele.
  useEffect(() => {
    const tecla = (e) => { if (e.key === "Escape") { e.stopPropagation(); aoFechar?.(); } };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aoFechar]);

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
          <h3 id="mag-titulo">Escolher o ativo da nova mesa</h3>
          <button className="mag-fechar" onClick={aoFechar} aria-label="Fechar">✕</button>
        </div>

        <div className="mag-busca">
          <SearchBar
            mercado={mercado}
            autoFoco
            onSelect={(a) => aoEscolher?.({ ticker: a.ticker })}
          />
        </div>
      </div>
    </div>
  );
}
