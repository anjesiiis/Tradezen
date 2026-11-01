import { useEffect, useRef } from "react";

/**
 * TRADEZEN — ABRIR UM TEMPLATE LEVA A PESSOA ATÉ O GRÁFICO
 * ========================================================
 *
 * Os cards dos templates ficam no FIM da página; o gráfico, no começo.
 * Clicar em "Visualizar" montava o gráfico lá em cima e deixava a pessoa
 * parada embaixo, olhando a lista — parecia que o clique não tinha feito
 * nada, quando na verdade já tinha aberto.
 *
 * Rola só quando o template ABERTO muda, e é por isso que a chave é o
 * `id` e não o objeto: arrastar um ponto na edição troca o objeto do
 * `editando` a cada quadro, e rolar a cada quadro prenderia a página no
 * topo enquanto a pessoa tenta mexer no gráfico.
 *
 * Fechar e reabrir o MESMO template funciona porque a chave passa por
 * null no meio: 7 → null → 7 são três valores diferentes.
 */
export function useSubirAoAbrir(chave) {
  const ref = useRef(null);

  useEffect(() => {
    if (chave == null) return;        // nada aberto: não mexe no scroll
    const alvo = ref.current;
    // jsdom não implementa scrollIntoView, e navegador antigo pode não
    // ter: sem o guarda, abrir um template derrubaria a tela inteira.
    if (typeof alvo?.scrollIntoView !== "function") return;

    // Quem pediu menos movimento no sistema vai direto, sem a animação.
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    alvo.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "start" });
  }, [chave]);

  return ref;
}

/**
 * A chave a passar pro hook: o id do que está aberto, ou null.
 *
 * Função própria porque as quatro telas de marcação precisam concordar
 * sobre isto — e porque `editando?.id` sozinho devolve `undefined`
 * quando nada está aberto, que não é a mesma coisa que null pro effect.
 */
export function chaveDoAberto(editando) {
  return editando?.id ?? null;
}
