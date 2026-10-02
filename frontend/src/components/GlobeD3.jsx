import { useEffect, useRef, useState } from "react";
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";

// Globo 3D interativo (d3.geoOrthographic) com o mapa real do mundo.
//
// O desenho é IMPERATIVO de propósito. A primeira versão guardava a
// rotação em estado do React: a cada quadro da animação o componente
// inteiro re-renderizava e o path dos países (milhares de pontos) era
// remontado — 60 vezes por segundo. Era isso que fazia o globo tremer
// quando o mouse passava por cima: o movimento do mouse disputava tempo
// com esse trabalho todo. Agora o React monta a estrutura uma vez e o
// requestAnimationFrame só atualiza atributos (`d`, `transform`) nos nós
// que já existem.
//
// Fica num componente próprio e é carregado sob demanda (lazy) porque o
// d3-geo + o topojson do mundo somam uns 200 KB — nada disso pode cair no
// chunk principal, que tem orçamento de 300 KB (ver CLAUDE.md).

const MAPA = "/world-110m.json";

// Cores do mapa: não existe equivalente no design system do app (que é de
// gráfico, não de cartografia), então ficam aqui, só deste componente.
const OCEANO = "#05080F";
const PAISES = "#1A3A5C";
const BORDAS = "#2A5080";

const GIRO_POR_QUADRO = 0.06;     // graus — bem devagar, não distrai
const PAUSA_APOS_ARRASTO = 2000;  // ms parado depois que a mão sai
const GRAUS_POR_PIXEL = 0.25;     // mouse
const SENSIBILIDADE_TOQUE = 0.4;  // dedo: movimento mais direto
const TOLERANCIA_DO_TOQUE = 8;    // px: acima disso o dedo está arrastando
const DURACAO_DO_TOQUE = 400;     // ms: acima disso não é toque, é demora
const RAIO_TOQUE = 22;            // alvo maior no dedo que no mouse
const RAIO_HOVER = 14;            // px até o ponto pra o tooltip aparecer
const ALTURA_DO_ROTULO = 12;      // px acima do ponto (sobe mais se houver outro ali)

// Zoom: 1 é o tamanho de abertura, já 20% maior que o do primeiro desenho
// Campo de estrelas: fica parado atrás do globo, dá fundo ao espaço vazio
const ESTRELAS = 140;
// Sorteio determinístico: o céu é o mesmo em todo render e em toda sessão
// (com Math.random, cada re-render mudaria a posição das estrelas).
const sorteio = (semente) => { const x = Math.sin(semente + 1) * 10000; return x - Math.floor(x); };

const ZOOM_MIN = 0.7;
const ZOOM_MAX = 2.5;
const FOLGA_DA_ESFERA = 0.92;     // sobra pra o globo não encostar na borda

function campoDeEstrelas(tamanho, raioDoGlobo) {
  const centro = tamanho / 2;
  const perto = raioDoGlobo + 8;
  const longe = centro * 1.42;            // canto do quadro
  const estrelas = [];
  for (let i = 0; i < ESTRELAS; i++) {
    const angulo = sorteio(i * 2.7) * Math.PI * 2;
    const distancia = perto + sorteio(i * 6.1) * (longe - perto);
    const x = centro + Math.cos(angulo) * distancia;
    const y = centro + Math.sin(angulo) * distancia;
    if (x < 0 || x > tamanho || y < 0 || y > tamanho) continue;
    estrelas.push({
      x, y,
      r: sorteio(i * 11.3) * 1.1 + 0.3,
      opacidade: (sorteio(i * 4.9) * 0.35 + 0.08).toFixed(2),
    });
  }
  return estrelas;
}

export default function GlobeD3({ mercados = [], selecionado, aoSelecionar, aoTocarFora, tamanho = 460 }) {
  const [mundo, setMundo] = useState(null);
  const [erro, setErro] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  const svgRef = useRef(null);
  const esferaRef = useRef(null);
  const paisesRef = useRef(null);
  const malhaRef = useRef(null);
  const tooltipRef = useRef(null);
  const pontosRef = useRef(new Map());   // id do mercado → <g> no SVG

  const rotacaoRef = useRef([40, 10]);   // abre virado pro Brasil
  const zoomRef = useRef(1);
  const girandoRef = useRef(true);
  const arrastoRef = useRef(null);
  const retomarRef = useRef(null);
  const mercadosRef = useRef(mercados);
  mercadosRef.current = mercados;
  // os handlers de toque são registrados uma vez; sem os refs eles ficariam
  // com a versão antiga das funções
  const aoSelecionarRef = useRef(aoSelecionar);
  aoSelecionarRef.current = aoSelecionar;
  const aoTocarForaRef = useRef(aoTocarFora);
  aoTocarForaRef.current = aoTocarFora;

  // Mapa do mundo: topojson → GeoJSON uma vez só
  useEffect(() => {
    let vivo = true;
    fetch(MAPA)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("mapa"))))
      .then((topo) => { if (vivo) setMundo(feature(topo, topo.objects.countries)); })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, []);

  // ── Desenho ────────────────────────────────────────────────
  // Uma projeção só, reaproveitada: mexer nela é mais barato que criar
  // outra a cada quadro.
  const projecaoRef = useRef(geoOrthographic().clipAngle(90));

  useEffect(() => {
    if (!mundo) return;
    const projecao = projecaoRef.current;
    const raioBase = (tamanho / 2) * FOLGA_DA_ESFERA;
    const caminho = geoPath(projecao);
    const malha = geoGraticule10();

    function desenhar() {
      const raio = raioBase * zoomRef.current;
      projecao.scale(raio).translate([tamanho / 2, tamanho / 2]).rotate(rotacaoRef.current);

      esferaRef.current?.setAttribute("r", String(raio));
      paisesRef.current?.setAttribute("d", caminho(mundo) || "");
      malhaRef.current?.setAttribute("d", caminho(malha) || "");

      const centro = [-rotacaoRef.current[0], -rotacaoRef.current[1]];
      const postos = [];   // rótulos já colocados, pra não escreverem um sobre o outro
      for (const mercado of mercadosRef.current) {
        const no = pontosRef.current.get(mercado.id);
        if (!no) continue;
        const daFrente = geoDistance([mercado.lng, mercado.lat], centro) < Math.PI / 2;
        const xy = daFrente && projecao([mercado.lng, mercado.lat]);
        if (!xy) { no.style.display = "none"; continue; }
        no.style.display = "";
        no.setAttribute("transform", `translate(${xy[0]}, ${xy[1]})`);

        // Brasília e São Paulo (ou Londres e Frankfurt) caem quase no mesmo
        // ponto: sem isso os rótulos ficam escritos um por cima do outro.
        const texto = no.querySelector("text");
        if (!texto) continue;
        let altura = ALTURA_DO_ROTULO;
        while (postos.some((p) => Math.abs(p.x - xy[0]) < 26 && Math.abs(p.y - (xy[1] - altura)) < 11)) {
          altura += 11;
        }
        texto.setAttribute("y", String(-altura));
        postos.push({ x: xy[0], y: xy[1] - altura });
      }
    }

    let quadro;
    const passo = () => {
      if (girandoRef.current) rotacaoRef.current = [rotacaoRef.current[0] + GIRO_POR_QUADRO, rotacaoRef.current[1]];
      desenhar();
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(retomarRef.current);
    };
  }, [mundo, tamanho, mercados]);

  // ── Girar ──────────────────────────────────────────────────
  function pararDeGirar() {
    girandoRef.current = false;
    clearTimeout(retomarRef.current);
  }

  function retomarDepois() {
    clearTimeout(retomarRef.current);
    retomarRef.current = setTimeout(() => { girandoRef.current = true; }, PAUSA_APOS_ARRASTO);
  }

  function pegar(evento) {
    if (evento.pointerType === "touch") return;   // toque tem caminho próprio
    pararDeGirar();
    esconderTooltip();
    arrastoRef.current = { x: evento.clientX, y: evento.clientY, rotacao: rotacaoRef.current };
    setArrastando(true);
    evento.currentTarget.setPointerCapture?.(evento.pointerId);
  }

  function mover(evento) {
    if (evento.pointerType === "touch") return;
    const inicio = arrastoRef.current;
    // Arrasto e hover são coisas separadas: enquanto se gira o globo, o
    // tooltip não tem por que ficar piscando atrás do cursor.
    if (!inicio) { aoPassarPorCima(evento); return; }
    const lon = inicio.rotacao[0] + (evento.clientX - inicio.x) * GRAUS_POR_PIXEL;
    const lat = inicio.rotacao[1] - (evento.clientY - inicio.y) * GRAUS_POR_PIXEL;
    rotacaoRef.current = [lon, Math.max(-90, Math.min(90, lat))];
  }

  function soltar() {
    if (!arrastoRef.current) return;
    arrastoRef.current = null;
    setArrastando(false);
    retomarDepois();
  }

  // ── Zoom ───────────────────────────────────────────────────
  function aplicarZoom(fator) {
    zoomRef.current = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomRef.current * fator));
  }

  function naRoda(evento) {
    evento.preventDefault();
    pararDeGirar();
    aplicarZoom(evento.deltaY < 0 ? 1.08 : 1 / 1.08);
    retomarDepois();
  }


  // ── Toque (celular) ────────────────────────────────────────
  // Listeners nativos com { passive: false }: o React registra os eventos
  // de toque como passivos, e aí o preventDefault() é ignorado — a página
  // rolava por baixo do dedo em vez de o globo girar. Um dedo gira, dois
  // dedos dão zoom.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !mundo) return;

    let inicioX = null;
    let inicioY = null;
    let rotacaoNoToque = null;
    let distanciaEntreDedos = null;
    let comecouEm = 0;
    let arrastou = false;
    const raioBase = (tamanho / 2) * FOLGA_DA_ESFERA;

    const distancia = (toques) =>
      Math.hypot(toques[0].clientX - toques[1].clientX, toques[0].clientY - toques[1].clientY);

    function comecou(evento) {
      if (evento.touches.length === 2) {
        evento.preventDefault();
        pararDeGirar();
        inicioX = null;                        // dois dedos é pinça, não arrasto
        distanciaEntreDedos = distancia(evento.touches);
        return;
      }
      if (evento.touches.length === 1) {
        evento.preventDefault();
        pararDeGirar();
        esconderTooltip();
        inicioX = evento.touches[0].clientX;
        inicioY = evento.touches[0].clientY;
        comecouEm = Date.now();
        arrastou = false;
        // guarda a rotação do começo e soma o deslocamento TOTAL a cada
        // quadro: somar o deslocamento de cada evento acumula erro e treme
        rotacaoNoToque = [...rotacaoRef.current];
      }
    }

    function moveu(evento) {
      if (evento.touches.length === 2 && distanciaEntreDedos !== null) {
        evento.preventDefault();
        const agora = distancia(evento.touches);
        // afastar os dedos aproxima o globo; juntar, afasta
        const raioAgora = raioBase * zoomRef.current + (agora - distanciaEntreDedos) * 0.5;
        zoomRef.current = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, raioAgora / raioBase));
        distanciaEntreDedos = agora;
        return;
      }
      if (evento.touches.length === 1 && inicioX !== null) {
        evento.preventDefault();
        const dx = evento.touches[0].clientX - inicioX;
        const dy = evento.touches[0].clientY - inicioY;
        if (Math.hypot(dx, dy) > TOLERANCIA_DO_TOQUE) arrastou = true;
        const lat = rotacaoNoToque[1] - dy * SENSIBILIDADE_TOQUE;
        rotacaoRef.current = [
          rotacaoNoToque[0] + dx * SENSIBILIDADE_TOQUE,
          Math.max(-90, Math.min(90, lat)),
        ];
      }
    }

    function terminou(evento) {
      // Toque curto e parado é TOQUE, não arrasto: abre o card do ponto (ou
      // fecha o que estiver aberto, se o dedo caiu no vazio). Sem isto o
      // celular não abria nada — o preventDefault do arrasto engole o
      // clique sintético que o onClick dos pontos esperava.
      const dedo = evento?.changedTouches?.[0];
      const rapido = Date.now() - comecouEm < DURACAO_DO_TOQUE;
      if (dedo && inicioX !== null && !arrastou && rapido) {
        const area = svgRef.current?.getBoundingClientRect();
        if (area) {
          const alvo = pontoEm(dedo.clientX - area.left, dedo.clientY - area.top, RAIO_TOQUE);
          if (alvo) aoSelecionarRef.current?.(alvo.mercado, { x: alvo.x, y: alvo.y });
          else aoTocarForaRef.current?.();
        }
      }
      inicioX = null;
      inicioY = null;
      distanciaEntreDedos = null;
      retomarDepois();
    }

    svg.addEventListener("touchstart", comecou, { passive: false });
    svg.addEventListener("touchmove", moveu, { passive: false });
    svg.addEventListener("touchend", terminou);
    svg.addEventListener("touchcancel", terminou);
    return () => {
      svg.removeEventListener("touchstart", comecou);
      svg.removeEventListener("touchmove", moveu);
      svg.removeEventListener("touchend", terminou);
      svg.removeEventListener("touchcancel", terminou);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mundo, tamanho]);

  // ── Tooltip ────────────────────────────────────────────────
  // div solto por cima do SVG, com pointer-events:none: dentro do SVG ele
  // roubaria o cursor dos pontos e mudaria o layout a cada movimento.
  // Qual ponto está embaixo de (x, y), em coordenada do SVG
  function pontoEm(x, y, tolerancia = RAIO_HOVER) {
    for (const mercado of mercadosRef.current) {
      const no = pontosRef.current.get(mercado.id);
      if (!no || no.style.display === "none") continue;
      const [px, py] = (no.getAttribute("transform") || "")
        .replace(/[^\d.,-]/g, "").split(",").map(Number);
      if (Math.hypot(px - x, py - y) <= tolerancia) return { mercado, x: px, y: py };
    }
    return null;
  }

  function aoPassarPorCima(evento) {
    const area = svgRef.current?.getBoundingClientRect();
    const dica = tooltipRef.current;
    if (!area || !dica) return;
    const x = evento.clientX - area.left;
    const y = evento.clientY - area.top;

    const achado = pontoEm(x, y)?.mercado || null;
    if (!achado) { esconderTooltip(); return; }
    dica.textContent = `${achado.categoria === "acao" ? achado.nome : achado.sigla} · ${achado.cidade}`;
    dica.style.transform = `translate3d(${x + 14}px, ${y - 10}px, 0)`;
    dica.style.opacity = "1";
  }

  function esconderTooltip() {
    const dica = tooltipRef.current;
    if (dica) dica.style.opacity = "0";
  }

  const estrelas = campoDeEstrelas(tamanho, (tamanho / 2) * FOLGA_DA_ESFERA);

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

  return (
    <div className="globo-palco" style={{ width: tamanho, height: tamanho }}>
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
        onPointerLeave={() => { soltar(); esconderTooltip(); }}
        onWheel={naRoda}
        style={{ touchAction: "none", cursor: arrastando ? "grabbing" : "grab" }}
      >
        <defs>
          {/* luz vinda de cima à esquerda, pra a esfera não parecer um disco */}
          <radialGradient id="globo-halo" cx="38%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#112240" />
            <stop offset="100%" stopColor="#040c18" />
          </radialGradient>
        </defs>

        <g className="globo-estrelas" pointerEvents="none">
          {estrelas.map((e, i) => (
            <circle key={i} cx={e.x} cy={e.y} r={e.r} fill={`rgba(190, 215, 255, ${e.opacidade})`} />
          ))}
        </g>

        <circle ref={esferaRef} className="globo-esfera" cx={tamanho / 2} cy={tamanho / 2} r={tamanho / 2} fill="url(#globo-halo)" stroke={BORDAS} strokeWidth="1" />
        {/* malha de latitude/longitude — cor no CSS, que muda com o tema */}
        <path ref={malhaRef} className="globo-malha" fill="none" />
        <path ref={paisesRef} fill={PAISES} stroke={BORDAS} strokeWidth="0.5" />

        {mercados.map((mercado) => {
          const ativo = selecionado?.id === mercado.id;
          // moeda é ponto menor: são cinco e não devem poluir o mapa
          const raio = mercado.categoria === "moeda" ? 3 : 4;
          return (
            <g
              key={mercado.id}
              ref={(no) => {
                if (no) pontosRef.current.set(mercado.id, no);
                else pontosRef.current.delete(mercado.id);
              }}
              className="globo-ponto"
              style={{ display: "none" }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const [x, y] = (e.currentTarget.getAttribute("transform") || "")
                  .replace(/[^\d.,-]/g, "").split(",").map(Number);
                aoSelecionar?.(mercado, { x, y });
              }}
              role="button"
              tabIndex={0}
              aria-label={`${mercado.categoria === "acao" ? mercado.nome : mercado.sigla} — ${mercado.cidade}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const [x, y] = (e.currentTarget.getAttribute("transform") || "")
                    .replace(/[^\d.,-]/g, "").split(",").map(Number);
                  aoSelecionar?.(mercado, { x, y });
                }
              }}
            >
              {/* alvo invisível: o ponto da moeda tem raio 3 e o globo gira
                  enquanto se mira — clicar nele a olho nu seria sorte */}
              <circle r="12" fill="transparent" />
              <circle r={(ativo ? raio + 1.5 : raio) * 2.25} fill={mercado.cor} opacity="0.18" />
              <circle r={ativo ? raio + 1.5 : raio} fill={mercado.cor} stroke={OCEANO} strokeWidth="1" />
              <text y={-ALTURA_DO_ROTULO} textAnchor="middle" fill={mercado.cor} fontSize="10" fontWeight="700">
                {mercado.codigo || mercado.sigla}
              </text>
            </g>
          );
        })}
      </svg>

      <div ref={tooltipRef} className="globo-dica" aria-hidden="true" />
    </div>
  );
}
