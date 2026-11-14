/**
 * As estrelas de um nível de qualidade: cheias, meias e vazias.
 *
 * Um componente só, usado pelo seletor e pelo selo do card — duas
 * renderizações da mesma coisa divergiriam na primeira mudança, e aí a
 * nota no card não bateria com a do seletor logo acima dela.
 *
 * MEIA ESTRELA é um ★ vazio com um ★ cheio recortado pela metade em cima,
 * e não um caractere "meia estrela": esse caractere (⯨) não existe em
 * boa parte das fontes de sistema e cairia como retângulo vazio no
 * aparelho de quem avalia. Assim a meia usa o MESMO glifo das outras, o
 * que também garante que ela tenha exatamente a mesma largura e altura.
 *
 * `aria-hidden` sempre: quem chama escreve o nome do nível ao lado, e um
 * leitor de tela lendo "estrela estrela estrela" antes de "Alta" só
 * atrasa quem está ouvindo.
 *
 * Caractere literal (★ e ☆), nunca escape CSS tipo \\2605: num template
 * literal sem tag isso é erro de build, e já derrubou o build deste
 * projeto duas vezes.
 */
export default function Estrelas({ cheias, total }) {
  return (
    <span className="sq-estrelas" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        // Quanto desta estrela está preenchido: 1 cheia, 0.5 meia, 0 vazia.
        const preenchida = Math.min(1, Math.max(0, cheias - i));
        if (preenchida >= 1) return <span key={i} className="cheia">★</span>;
        if (preenchida <= 0) return <span key={i} className="vazia">☆</span>;
        return (
          <span key={i} className="meia">
            <span className="meia-vazia">☆</span>
            <span className="meia-cheia">★</span>
          </span>
        );
      })}
    </span>
  );
}
