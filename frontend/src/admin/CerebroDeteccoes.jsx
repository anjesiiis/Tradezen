import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPanorama } from "./adminApi.js";

/**
 * CÉREBRO DE DETECÇÕES — o panorama do trabalho de marcação.
 *
 * Quatro lobos, uma família de padrão cada. Passar o mouse acende o lobo e
 * mostra os números dele; clicar vai pra primeira tela daquela família.
 *
 * POR QUE CLICAR NAVEGA EM VEZ DE FILTRAR: cada tela do admin lista UM
 * padrão só (a de Bandeira de Alta mostra bandeiras de alta). Não existe
 * uma lista de "todas as continuações" pra filtrar — filtrar por família
 * ali não teria o que esconder nem o que mostrar. Então o clique leva pra
 * onde aquela família é marcada, que é o que a pessoa quer ao clicar.
 *
 * NÃO É DETECÇÃO AUTOMÁTICA. Tudo aqui é contagem do que foi marcado à
 * mão: nenhum modelo, nenhuma inferência, nenhum padrão achado por
 * máquina. "Cérebro" é o nome do desenho.
 *
 * AS CORES são as quatro variáveis do tema de admin (--gold, --accent,
 * --up, --down), não uma paleta nova. O roteiro pedia laranja no quarto
 * lobo e não existe token de laranja aqui; --down (#FF4560) é o mais
 * próximo, e o que importa é os quatro serem distinguíveis entre si.
 *
 * O desenho é DECORATIVO (aria-hidden): os mesmos números estão escritos
 * ao lado, em texto, e os lobos são <button> com nome acessível. Quem usa
 * leitor de tela recebe a informação sem precisar do SVG.
 */

const LOBOS = [
  {
    chave: "continuacao", lobo: "Frontal", cor: "var(--gold)",
    destino: "/admin/templates/bandeira-alta",
    // Elipse de cada lobo, recortada pela silhueta do cérebro.
    cx: 100, cy: 42, rx: 62, ry: 34,
  },
  {
    chave: "reversao", lobo: "Parietal", cor: "var(--accent)",
    destino: "/admin/templates/topo-duplo",
    cx: 100, cy: 80, rx: 66, ry: 28,
  },
  {
    chave: "niveis", lobo: "Temporal", cor: "var(--up)",
    destino: "/admin/templates/niveis",
    cx: 100, cy: 112, rx: 60, ry: 26,
  },
  {
    chave: "triangulos", lobo: "Occipital", cor: "var(--down)",
    destino: "/admin/templates/canal-alta",
    cx: 100, cy: 140, rx: 46, ry: 22,
  },
];

// Silhueta orgânica do cérebro visto de cima: duas metades com a fissura
// no meio. Serve de clip pros quatro lobos, e é o que faz quatro elipses
// parecerem um cérebro em vez de quatro elipses.
const SILHUETA = "M100 8 C140 8 172 34 172 70 C172 92 166 106 160 120 "
  + "C152 140 134 162 100 162 C66 162 48 140 40 120 C34 106 28 92 28 70 "
  + "C28 34 60 8 100 8 Z";

const data = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

export default function CerebroDeteccoes() {
  const [familias, setFamilias] = useState(null);
  const [erro, setErro] = useState(null);
  const [aceso, setAceso] = useState("continuacao");

  useEffect(() => {
    let vivo = true;
    fetchPanorama()
      .then((d) => { if (vivo) setFamilias(d?.familias || {}); })
      // Painel é enfeite informativo: se ele não carrega, diz isso numa
      // linha e sai de cena. Derrubar a tela de marcação por causa do
      // resumo seria trocar o trabalho pelo relatório do trabalho.
      .catch((e) => { if (vivo) setErro(e?.message || "não carregou"); });
    return () => { vivo = false; };
  }, []);

  const dados = familias?.[aceso];

  return (
    <aside className="cerebro" aria-label="Cérebro de Detecções TradeZen">
      <header className="cerebro-cabeca">
        <h3>Cérebro de Detecções TradeZen</h3>
        <p>cada lobo mostra a inteligência coletada por categoria</p>
      </header>

      {erro && <p className="cerebro-erro">O panorama não carregou: {erro}</p>}

      <div className="cerebro-desenho">
        <svg viewBox="0 0 200 170" role="img" aria-hidden="true" focusable="false">
          <defs>
            <clipPath id="cerebro-clip">
              <path d={SILHUETA} />
            </clipPath>
          </defs>

          <g clipPath="url(#cerebro-clip)">
            {LOBOS.map((l) => (
              <ellipse
                key={l.chave}
                className={`cerebro-lobo${aceso === l.chave ? " aceso" : ""}`}
                cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry}
                style={{ fill: l.cor }}
              />
            ))}

            {/* Fissura central e sulcos: é o que lê como cérebro. */}
            <path className="cerebro-fissura" d="M100 10 L100 160" />
            <path className="cerebro-sulco" d="M58 36 C78 48 78 62 58 74" />
            <path className="cerebro-sulco" d="M142 36 C122 48 122 62 142 74" />
            <path className="cerebro-sulco" d="M54 94 C76 104 76 118 54 128" />
            <path className="cerebro-sulco" d="M146 94 C124 104 124 118 146 128" />
          </g>

          {/* Sinapses: tracejado que caminha entre os lobos. Decorativo. */}
          <g className="cerebro-sinapses">
            <path d="M46 54 C86 66 114 66 154 54" />
            <path d="M44 92 C84 104 116 104 156 92" />
            <path d="M56 128 C84 138 116 138 144 128" />
          </g>

          <path className="cerebro-contorno" d={SILHUETA} />
        </svg>

        {/* Os botões ficam FORA do SVG: <ellipse> clicável dentro de um
            clipPath vira alvo de clique recortado e esquisito no celular,
            e botão de verdade já vem com foco, teclado e tooltip. */}
        <div className="cerebro-botoes">
          {LOBOS.map((l) => {
            const f = familias?.[l.chave];
            return (
              <button
                key={l.chave}
                type="button"
                className={`cerebro-botao${aceso === l.chave ? " aceso" : ""}`}
                style={{ "--lobo-cor": l.cor }}
                onMouseEnter={() => setAceso(l.chave)}
                onFocus={() => setAceso(l.chave)}
                onClick={() => setAceso(l.chave)}
                aria-pressed={aceso === l.chave}
                title={`Lobo ${l.lobo} — ${f?.nome || l.chave}`}
              >
                <span className="cerebro-bolinha" aria-hidden="true" />
                {f?.nome || l.chave}
                <strong>{f ? f.total : "—"}</strong>
              </button>
            );
          })}
        </div>
      </div>

      {dados ? (
        <div className="cerebro-ficha">
          <strong className="cerebro-ficha-nome">{dados.nome}</strong>
          <dl>
            <div><dt>Marcadas</dt><dd>{dados.total}</dd></div>
            <div>
              <dt>Taxa de sucesso</dt>
              {/* `null` quando ninguém tem desfecho ainda: 0% diria que
                  tudo falhou, que é afirmação diferente de "não sei". */}
              <dd>{dados.taxa_sucesso === null ? "sem desfecho ainda" : `${dados.taxa_sucesso}%`}</dd>
            </div>
            <div><dt>Sucesso · falha</dt><dd>{dados.sucesso} · {dados.falha}</dd></div>
            <div><dt>Última marcação</dt><dd>{data(dados.ultimo)}</dd></div>
          </dl>

          <div className="cerebro-barra" title={`${dados.total} de ${dados.meta}`}>
            <span
              className="cerebro-barra-cheia"
              style={{
                width: `${Math.min(100, (100 * dados.total) / dados.meta)}%`,
                background: LOBOS.find((l) => l.chave === aceso)?.cor,
              }}
            />
          </div>
          <p className="cerebro-meta">{dados.total} de {dados.meta} pra fechar a família</p>

          <Link className="cerebro-ir" to={LOBOS.find((l) => l.chave === aceso).destino}>
            Marcar {dados.nome} →
          </Link>
        </div>
      ) : (
        !erro && <p className="cerebro-carregando">Somando as marcações…</p>
      )}
    </aside>
  );
}
