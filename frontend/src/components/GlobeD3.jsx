import { useEffect, useRef, useState } from "react";
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";

// Globo 3D interativo (d3.geoOrthographic) com o mapa real do mundo.
//
// Fica num componente próprio e é carregado sob demanda (lazy) porque o
// d3-geo + o topojson do mundo somam uns 200 KB — nada disso pode cair no
// chunk principal, que tem orçamento de 300 KB (ver CLAUDE.md).
//
// O desenho é SVG: os países viram um <path> só (bem mais barato que um
// path por país) e cada mercado é um <circle> na coordenada real, posto no
// lugar pela própria projeção — por isso o ponto some sozinho quando a
// bolsa está do outro lado do planeta.

const MAPA = "/world-110m.json";

// Cores do mapa: não existe equivalente no design system do app (que é de
// gráfico, não de cartografia), então ficam aqui, só deste componente.
const OCEANO = "#05080F";
const PAISES = "#1A3A5C";
const BORDAS = "#2A5080";

const GIRO_POR_QUADRO = 0.06;     // graus — bem devagar, não distrai
const PAUSA_APOS_ARRASTO = 2000;  // ms parado depois que a mão sai

export default function GlobeD3({ mercados = [], selecionado, aoSelecionar, tamanho = 460 }) {
  const [mundo, setMundo] = useState(null);
  const [erro, setErro] = useState(false);
  // Abre virado pro Brasil (centro ≈ lon -40, lat -10): o público é
  // brasileiro, e a B3 tem que estar na primeira olhada.
  const [rotacao, setRotacao] = useState([40, 10]);
  const svgRef = useRef(null);
  const arrastoRef = useRef(null);
  const retomarRef = useRef(null);
  const girandoRef = useRef(true);
  // só pro cursor: ler um ref durante o render não vale
  const [arrastando, setArrastando] = useState(false);

  // Mapa do mundo: topojson → GeoJSON uma vez só
  useEffect(() => {
    let vivo = true;
    fetch(MAPA)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("mapa"))))
      .then((topo) => { if (vivo) setMundo(feature(topo, topo.objects.countries)); })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, []);

  // Auto-rotação
  useEffect(() => {
    if (!mundo) return;
    let quadro;
    const girar = () => {
      if (girandoRef.current) setRotacao(([lon, lat]) => [lon + GIRO_POR_QUADRO, lat]);
      quadro = requestAnimationFrame(girar);
    };
    quadro = requestAnimationFrame(girar);
    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(retomarRef.current);
    };
  }, [mundo]);

  // ── Arrastar pra girar (mouse e toque) ──────────────────────
  function pegar(evento) {
    girandoRef.current = false;
    clearTimeout(retomarRef.current);
    arrastoRef.current = { x: evento.clientX, y: evento.clientY, rotacao };
    setArrastando(true);
    evento.currentTarget.setPointerCapture?.(evento.pointerId);
  }

  function mover(evento) {
    const inicio = arrastoRef.current;
    if (!inicio) return;
    // 0.25 grau por pixel: o giro acompanha a mão sem sair rodopiando
    const sensibilidade = 0.25;
    const lon = inicio.rotacao[0] + (evento.clientX - inicio.x) * sensibilidade;
    const lat = inicio.rotacao[1] - (evento.clientY - inicio.y) * sensibilidade;
    setRotacao([lon, Math.max(-90, Math.min(90, lat))]);
  }

  function soltar() {
    if (!arrastoRef.current) return;
    arrastoRef.current = null;
    setArrastando(false);
    retomarRef.current = setTimeout(() => { girandoRef.current = true; }, PAUSA_APOS_ARRASTO);
  }

  if (erro) {
    return (
      <div className="globo-erro" style={{ width: tamanho, height: tamanho }}>
        Não foi possível carregar o mapa do mundo.
      </div>
    );
  }
  if (!mundo) {
    return <div className="globo-carregando" style={{ width: tamanho, height: tamanho }} aria-hidden="true" />;
  }

  const raio = tamanho / 2 - 4;
  const projecao = geoOrthographic()
    .scale(raio)
    .translate([tamanho / 2, tamanho / 2])
    .rotate(rotacao)
    .clipAngle(90);
  const caminho = geoPath(projecao);

  // Só os mercados na metade da Terra virada pra nós. A projeção sozinha
  // não resolve isso (ela devolve coordenada também pro lado de trás, que
  // apareceria espelhado em cima do globo): o que decide é a distância
  // angular até o centro — menos de 90° está na frente.
  const centro = [-rotacao[0], -rotacao[1]];
  const pontos = mercados
    .map((m) => ({ mercado: m, xy: projecao([m.lng, m.lat]), daFrente: geoDistance([m.lng, m.lat], centro) < Math.PI / 2 }))
    .filter(({ xy, daFrente }) => xy && daFrente);

  return (
    <svg
      ref={svgRef}
      className="globo"
      width={tamanho}
      height={tamanho}
      viewBox={`0 0 ${tamanho} ${tamanho}`}
      role="img"
      aria-label="Globo com as principais bolsas do mundo"
      onPointerDown={pegar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onPointerLeave={soltar}
      style={{ touchAction: "none", cursor: arrastando ? "grabbing" : "grab" }}
    >
      <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} fill={OCEANO} stroke={BORDAS} strokeWidth="1" />
      <path d={caminho(geoGraticule10())} fill="none" stroke={BORDAS} strokeWidth="0.3" opacity="0.35" />
      <path d={caminho(mundo)} fill={PAISES} stroke={BORDAS} strokeWidth="0.5" />

      {pontos.map(({ mercado, xy }) => {
        const ativo = selecionado?.id === mercado.id;
        return (
          <g
            key={mercado.id}
            className="globo-ponto"
            transform={`translate(${xy[0]}, ${xy[1]})`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); aoSelecionar?.(mercado, { x: xy[0], y: xy[1] }); }}
            role="button"
            tabIndex={0}
            aria-label={`${mercado.sigla} — ${mercado.cidade}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                aoSelecionar?.(mercado, { x: xy[0], y: xy[1] });
              }
            }}
          >
            <circle r={ativo ? 11 : 9} fill={mercado.cor} opacity="0.18" />
            <circle r={ativo ? 5.5 : 4} fill={mercado.cor} stroke="#05080F" strokeWidth="1" />
            <text y={-12} textAnchor="middle" fill={mercado.cor} fontSize="10" fontWeight="700">
              {mercado.codigo || mercado.sigla}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
