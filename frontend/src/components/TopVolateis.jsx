import { useEffect, useState } from "react";
import {
  buscarTopVolateis, grupoFecha, nomeDoGrupo, precoComMoeda, pregaoEhDeHoje, simboloCurto,
} from "../lib/topVolateis.js";

/**
 * TRADEZEN — OS 5 MAIS VOLÁTEIS DO DIA
 * ====================================
 *
 * Entra dentro do card que já abre ao clicar num ponto do globo, em vez
 * de virar um segundo painel flutuante: o ponto já tem um card, e dois
 * cards no mesmo clique brigariam por espaço na mesma área de 320px.
 *
 * Volatilidade é amplitude, não direção — por isso cada linha mostra as
 * duas coisas, e a fórmula fica escrita no rodapé. Sem isso "14%" não
 * quer dizer nada: pode ser alta de 14%, queda de 14%, ou um dia que
 * subiu e desceu e fechou no mesmo lugar.
 */
export default function TopVolateis({ grupo, aoAbrirAtivo, limite = 5 }) {
  const [estado, setEstado] = useState({ fase: "carregando" });

  useEffect(() => {
    if (!grupo) return undefined;
    let vivo = true;
    setEstado({ fase: "carregando" });
    buscarTopVolateis(grupo, limite)
      .then((dado) => { if (vivo) setEstado({ fase: "pronto", ...dado }); })
      .catch(() => { if (vivo) setEstado({ fase: "erro" }); });
    return () => { vivo = false; };
  }, [grupo, limite]);

  if (!grupo) return null;

  const { fase, top = [], pregao } = estado;
  const fechado = fase === "pronto" && grupoFecha(grupo) && !pregaoEhDeHoje(pregao);

  return (
    <div className="tv-bloco">
      <div className="tv-topo">
        <span className="globo-popup-rotulo">Top 5 mais voláteis hoje</span>
        {fechado && <span className="tv-selo" title={`Último pregão: ${pregao.slice(0, 10)}`}>Mercado fechado</span>}
      </div>

      {fase === "carregando" && <p className="globo-popup-vazio">Medindo o pregão…</p>}
      {fase === "erro" && <p className="globo-popup-vazio">Não foi possível carregar agora.</p>}
      {fase === "pronto" && top.length === 0 && (
        <p className="globo-popup-vazio">Nenhum ativo de {nomeDoGrupo(grupo).toLowerCase()} respondeu agora.</p>
      )}

      {top.map((a, i) => (
        <button
          key={a.ticker}
          type="button"
          className="tv-linha"
          onClick={() => aoAbrirAtivo?.(a)}
          title={`${a.nome} — abriu em ${precoComMoeda(a.minima, a.moeda)}–${precoComMoeda(a.maxima, a.moeda)} no dia`}
        >
          <span className="tv-posicao">{i + 1}</span>
          <span className="tv-nomes">
            <span className="tv-simbolo">{simboloCurto(a)}</span>
            <span className="tv-nome">{a.nome}</span>
          </span>
          <span className="tv-numeros">
            <span className="tv-preco">{precoComMoeda(a.preco, a.moeda)}</span>
            <span className="tv-linha-baixo">
              {/* Amplitude primeiro: é o que ordena a lista. A direção vem
                  ao lado, porque uma sem a outra engana. */}
              <span className="tv-amplitude">↕ {a.volatilidade_pct.toFixed(2)}%</span>
              <span className={`tv-variacao ${a.variacao_pct >= 0 ? "alta" : "baixa"}`}>
                {a.variacao_pct >= 0 ? "▲" : "▼"} {Math.abs(a.variacao_pct).toFixed(2)}%
              </span>
            </span>
          </span>
        </button>
      ))}

      {fase === "pronto" && top.length > 0 && (
        <span className="globo-popup-nota">Volatilidade = (máxima − mínima) ÷ abertura</span>
      )}
    </div>
  );
}
