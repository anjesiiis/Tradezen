import { useEffect, useRef } from "react";

/**
 * TRADEZEN — A TELA QUE NÃO CABE
 * ==============================
 *
 * Aparece quando a pessoa pede uma tela além do que o plano dela dá. Um
 * componente só, com dois conteúdos, porque a casca é a mesma: fundo
 * escurecido, cartão, lista de ganhos, botões. Dois arquivos com a mesma
 * estrutura só garantem que um deles fica desatualizado.
 *
 * Quem vê o quê, e isto não se mistura nunca:
 *   visitante → "cadastro". Preço pra quem ainda não tem conta é cobrar
 *               antes de mostrar o produto.
 *   grátis    → "upgrade". É o degrau seguinte dela.
 *   premium   → não vê popup nenhum; já está no teto do que existe, e um
 *               aviso de texto basta (ver o Dashboard).
 *
 * Uma vez por sessão: a segunda vez já não informa nada, só atrapalha. A
 * marca fica no sessionStorage, que morre quando a aba fecha — aba nova,
 * pessoa nova, pode aparecer de novo.
 */

const CHAVE_VISTO = "tradezen-popup-limite-visto";

export function foiVistoNaSessao(motivo) {
  try {
    return sessionStorage.getItem(`${CHAVE_VISTO}-${motivo}`) === "1";
  } catch {
    return false;   // aba anônima ou storage bloqueado: mostra, e tudo bem
  }
}

export function marcarVistoNaSessao(motivo) {
  try { sessionStorage.setItem(`${CHAVE_VISTO}-${motivo}`, "1"); } catch { /* sem storage */ }
}

const CONTEUDO = {
  cadastrado: {
    etiqueta: null,
    titulo: "Quer ver dois ativos lado a lado?",
    frase: "Criar conta é grátis e te dá a segunda tela — além de guardar seus desenhos.",
    ganhos: [
      "2 telas simultâneas",
      "Seus desenhos salvos automaticamente",
      "A mesma bancada em qualquer aparelho",
      "Até 10 ativos na watchlist",
    ],
    preco: null,
    principal: { texto: "Criar conta grátis", para: "/cadastro" },
    secundario: { texto: "Já tenho conta", para: "/login" },
  },
  upgrade: {
    etiqueta: "PREMIUM",
    titulo: "Analise 4 ativos ao mesmo tempo",
    frase: "O dobro de telas do plano grátis, e a detecção de padrões por Machine Learning.",
    ganhos: [
      "4 telas simultâneas (o dobro do grátis)",
      "Detecção automática de padrões via Machine Learning",
      "Alertas em formação, desenvolvimento e confirmação",
      "Até 50 ativos na watchlist",
    ],
    // Mesmo valor e mesmo período da página de vendas. Se mudar lá, muda
    // aqui — dois preços diferentes no mesmo produto é o pior dos mundos.
    preco: { valor: "R$ 49", centavos: ",90", periodo: "/mês" },
    principal: { texto: "Ver o Premium", para: "/pagina-de-vendas#precos" },
    secundario: null,
  },
};

/**
 * @param {"cadastrado"|"upgrade"|null} motivo — null fecha
 * @param {() => void} aoFechar
 */
export default function PopupLimiteTelas({ motivo, aoFechar }) {
  const caixaRef = useRef(null);
  const conteudo = motivo ? CONTEUDO[motivo] : null;

  // Esc fecha, e o foco vai pro cartão: sem isso o leitor de tela
  // continua lendo a página atrás, que já não é o que está na frente.
  useEffect(() => {
    if (!conteudo) return;
    caixaRef.current?.focus();
    const aoTeclar = (e) => { if (e.key === "Escape") aoFechar(); };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [conteudo, aoFechar]);

  if (!conteudo) return null;

  return (
    <div className="plt-fundo" onMouseDown={aoFechar}>
      <div
        className="plt-caixa"
        ref={caixaRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={conteudo.titulo}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="plt-x" onClick={aoFechar} aria-label="Fechar">✕</button>

        {conteudo.etiqueta && <span className="plt-etiqueta">{conteudo.etiqueta}</span>}
        <h3 className="plt-titulo">{conteudo.titulo}</h3>
        <p className="plt-frase">{conteudo.frase}</p>

        <ul className="plt-ganhos">
          {conteudo.ganhos.map((g) => <li key={g}>{g}</li>)}
        </ul>

        {conteudo.preco && (
          <p className="plt-preco">
            <strong>{conteudo.preco.valor}</strong>{conteudo.preco.centavos}
            <span>{conteudo.preco.periodo}</span>
          </p>
        )}

        <div className="plt-botoes">
          {/* <a> de verdade, não botão com navigate: abre em nova aba com
              o meio do mouse, dá pra copiar o endereço, e o leitor de
              tela anuncia como link. */}
          <a className="plt-principal" href={conteudo.principal.para} onClick={aoFechar}>
            {conteudo.principal.texto}
          </a>
          {conteudo.secundario && (
            <a className="plt-secundario" href={conteudo.secundario.para} onClick={aoFechar}>
              {conteudo.secundario.texto}
            </a>
          )}
          <button type="button" className="plt-depois" onClick={aoFechar}>Agora não</button>
        </div>

        {/* O que o TradeZen não faz é parte da oferta, não letra miúda:
            fechar o aviso não tira nenhuma tela de ninguém. */}
        <p className="plt-rodape">
          Nenhum dado de comportamento é coletado. Suas análises são suas.
        </p>
      </div>
    </div>
  );
}
