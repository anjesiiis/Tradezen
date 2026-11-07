/**
 * As estrelas de um nível de qualidade: cheias e vazias.
 *
 * Um componente só, usado pelo seletor e pelo selo do card — duas
 * renderizações da mesma coisa divergiriam na primeira mudança, e aí a
 * nota no card não bateria com a do seletor logo acima dela.
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
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < cheias ? "cheia" : "vazia"}>
          {i < cheias ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}
