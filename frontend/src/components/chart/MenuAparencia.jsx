import { createPortal } from "react-dom";
import { PRESETS_CANDLE, TIPOS_GRAFICO, presetAtual } from "../../lib/grafico/aparencia.js";

/**
 * TRADEZEN — APARÊNCIA DO GRÁFICO
 * ===============================
 *
 * Como o preço é mostrado (candles ou linha) e com que cores. Tudo muda
 * na hora: é `applyOptions` na série, não gráfico recriado, então zoom e
 * posição ficam onde estavam.
 *
 * Por portal, como o dropdown de indicadores: dentro do `.analysis` o
 * z-index da barra engoliria o menu.
 */
export default function MenuAparencia({ pos, aparencia, aoMudar, aoFechar }) {
  const preset = presetAtual(aparencia.cores);

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }} onMouseDown={aoFechar}>
      <div
        className="ind-drop map-menu"
        style={{ position: "fixed", top: pos.top, left: pos.left }}
        onMouseDown={(e) => e.stopPropagation()}
        role="group"
        aria-label="Aparência do gráfico"
      >
        <div className="ind-section">Tipo de gráfico</div>
        <div className="map-tipos">
          {TIPOS_GRAFICO.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`map-tipo ${aparencia.tipo === t.id ? "ativo" : ""}`}
              aria-pressed={aparencia.tipo === t.id}
              onClick={() => aoMudar({ tipo: t.id })}
            >
              <IconeTipo tipo={t.id} />
              <span>{t.rotulo}</span>
            </button>
          ))}
        </div>

        <div className="ind-section">Cores dos candles</div>
        <div className="map-presets">
          {PRESETS_CANDLE.map((p) => (
            <button
              key={p.nome}
              type="button"
              title={p.nome}
              aria-label={p.nome}
              aria-pressed={preset === p.nome}
              className={`map-preset ${preset === p.nome ? "ativo" : ""}`}
              onClick={() => aoMudar({ cores: { alta: p.alta, baixa: p.baixa } })}
            >
              <span className="map-amostra" style={{ background: p.alta }} />
              <span className="map-amostra" style={{ background: p.baixa }} />
              <span className="map-preset-nome">{p.nome}</span>
            </button>
          ))}
        </div>

        {/* O conta-gotas do navegador, pra quem quer um tom que não está
            nos atalhos. Trocar aqui desfaz o preset — e é isso mesmo. */}
        <div className="map-custom">
          <label className="map-cor">
            <input
              type="color"
              value={aparencia.cores.alta}
              aria-label="Cor dos candles de alta"
              onChange={(e) => aoMudar({ cores: { alta: e.target.value } })}
            />
            <span>Alta</span>
          </label>
          <label className="map-cor">
            <input
              type="color"
              value={aparencia.cores.baixa}
              aria-label="Cor dos candles de baixa"
              onChange={(e) => aoMudar({ cores: { baixa: e.target.value } })}
            />
            <span>Baixa</span>
          </label>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function IconeTipo({ tipo, tamanho = 15 }) {
  const comum = {
    viewBox: "0 0 24 24", width: tamanho, height: tamanho,
    stroke: "currentColor", fill: "none", strokeWidth: 2,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  if (tipo === "linha") {
    return (
      <svg {...comum} aria-hidden="true">
        <polyline points="2 17 8 11 13 14 22 5" />
      </svg>
    );
  }
  // Dois candles: o pavio é a linha inteira, o corpo é o retângulo.
  return (
    <svg {...comum} aria-hidden="true">
      <line x1="8" y1="3" x2="8" y2="21" />
      <rect x="5" y="7" width="6" height="9" />
      <line x1="17" y1="5" x2="17" y2="19" />
      <rect x="14" y="9" width="6" height="7" />
    </svg>
  );
}
