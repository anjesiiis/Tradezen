import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * TRADEZEN — ONDE O POPOVER CABE
 * ==============================
 *
 * Ancora um painel num botão e escolhe o lado em que ele caiba na JANELA.
 * Isto existe porque a primeira versão ancorada do painel de indicadores
 * abria sempre `top = base do botão`, e nas mesas de baixo do multichart
 * esse ponto está a poucos pixels do pé da tela: o painel abria quase
 * todo invisível. Não era o grid do multichart cortando (o painel vive
 * num portal no document.body) — era o viewport.
 *
 * A ordem das decisões:
 *   1. tenta ABAIXO do botão, que é o que todo mundo espera de um menu;
 *   2. não cabendo, vai ACIMA;
 *   3. não cabendo em nenhum dos dois, fica no que sobrar mais espaço e
 *      o painel rola por dentro — melhor meio painel legível que um
 *      painel inteiro fora da tela;
 *   4. na horizontal alinha pela esquerda do botão, e pela direita
 *      quando passar da borda.
 *
 * MEDIR ANTES DE MOSTRAR: a primeira passada sai com `visibility:
 * hidden`, porque a altura do painel só se conhece depois de ele estar
 * no DOM — e é a altura que decide se cabe embaixo. Elemento com
 * visibility hidden ocupa espaço e pode ser medido; com `display:none`
 * não dá, e é por isso que não é display.
 */

const FOLGA = 8;    // respiro entre o botão e o painel
const MARGEM = 12;  // nunca encostar na borda da janela

export function usePosicaoPopover(ancoraRef, painelRef, ativo) {
  const [pos, setPos] = useState({ top: 0, left: 0, pronta: false, origem: "top left" });
  // Guarda o resultado pra não chamar setState com valor igual em cada
  // evento de scroll: rolar a página dispara isto dezenas de vezes.
  const ultimo = useRef("");

  const calcular = useCallback(() => {
    const ancora = ancoraRef?.current;
    const painel = painelRef?.current;
    if (!ancora || !painel) return;

    const b = ancora.getBoundingClientRect();
    const alturaPainel = painel.offsetHeight;
    const larguraPainel = painel.offsetWidth;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const cabeAbaixo = b.bottom + FOLGA + alturaPainel <= vh - MARGEM;
    const cabeAcima = b.top - FOLGA - alturaPainel >= MARGEM;
    // Sem espaço dos dois lados: fica no lado mais folgado.
    const paraBaixo = cabeAbaixo || (!cabeAcima && vh - b.bottom >= b.top);

    let top = paraBaixo ? b.bottom + FOLGA : b.top - FOLGA - alturaPainel;
    top = Math.max(MARGEM, Math.min(top, vh - MARGEM - alturaPainel));

    const passaDaDireita = b.left + larguraPainel > vw - MARGEM;
    let left = passaDaDireita ? b.right - larguraPainel : b.left;
    left = Math.max(MARGEM, Math.min(left, vw - MARGEM - larguraPainel));

    // A animação cresce do canto encostado no botão, não do centro.
    const origem = `${paraBaixo ? "top" : "bottom"} ${passaDaDireita ? "right" : "left"}`;
    const assinatura = `${Math.round(top)}|${Math.round(left)}|${origem}`;
    if (assinatura === ultimo.current) return;
    ultimo.current = assinatura;
    setPos({ top, left, pronta: true, origem });
  }, [ancoraRef, painelRef]);

  // Layout effect, não effect comum: posiciona antes do navegador pintar,
  // senão o painel aparece um quadro no canto errado e salta.
  useLayoutEffect(() => {
    if (!ativo) { ultimo.current = ""; setPos((p) => ({ ...p, pronta: false })); return; }
    calcular();
  }, [ativo, calcular]);

  useEffect(() => {
    if (!ativo) return;
    // `true` na captura: rolagem que acontece DENTRO de um container
    // (a barra da mesa rola no celular) não borbulha até a window.
    window.addEventListener("scroll", calcular, true);
    window.addEventListener("resize", calcular);

    // O painel muda de altura sozinho: trocar de aba ou buscar deixa a
    // grade mais curta. Sem observar isso, um painel que abriu pra cima
    // e encolheu fica com uma folga estranha, e um que cresceu vaza.
    let ro;
    if (typeof ResizeObserver !== "undefined" && painelRef?.current) {
      ro = new ResizeObserver(calcular);
      ro.observe(painelRef.current);
    }
    return () => {
      window.removeEventListener("scroll", calcular, true);
      window.removeEventListener("resize", calcular);
      ro?.disconnect();
    };
  }, [ativo, calcular, painelRef]);

  return pos;
}
