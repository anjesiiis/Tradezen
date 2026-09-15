import { API } from "../api.js";

export const normalizarTipo = (tipo = "") => {
  const t = (tipo || "").toLowerCase();
  return t;
};

// ── Templates marcados manualmente no admin (OCO/Topo Duplo/Suporte-Resistência),
// plugados no gráfico principal — não é detecção automática, é o histórico
// real já confirmado. Os pontos vêm com timestamp (não índice), porque foram
// marcados num recorte de candles diferente do que o usuário está vendo
// agora; resolvemos pro índice certo aqui.
export async function fetchPadroesMarcados(ticker, timeframe){
  try {
    const r = await fetch(`${API}/padroes-marcados/${encodeURIComponent(ticker)}?timeframe=${timeframe}`);
    if(!r.ok) return { padroes: [], niveis: [] };
    const d = await r.json();
    return { padroes: d.padroes || [], niveis: d.niveis || [] };
  } catch {
    return { padroes: [], niveis: [] };
  }
}

export function resolverPadroesPorTimestamp(padroesBrutos, candles){
  const tsParaIdx = new Map(candles.map((c,i) => [Math.floor(c.timestamp/1000), i]));
  const resolverPonto = (pt) => {
    if(!pt) return null;
    const idx = tsParaIdx.get(Math.floor(pt.timestamp/1000));
    return idx === undefined ? null : { i: idx, preco: pt.preco };
  };

  return padroesBrutos.map(p => {
    // Suporte/Resistência marcados vêm como uma LISTA de toques (2+), não
    // pontos fixos nomeados — a faixa só existe entre o primeiro e o
    // último toque, nunca uma reta infinita.
    if(p.pontos?.toques){
      const toquesResolvidos = p.pontos.toques.map(resolverPonto);
      if(toquesResolvidos.length < 2 || toquesResolvidos.some(v => !v)) return null;

      const indices = toquesResolvidos.map(t => t.i);
      return {
        ...p,
        toquesResolvidos,
        lampada: toquesResolvidos[toquesResolvidos.length - 1],
        intervalo_candles: { inicio: Math.min(...indices), fim: Math.max(...indices) },
      };
    }

    const pontosResolvidos = Object.fromEntries(
      Object.entries(p.pontos || {}).map(([k,v]) => [k, resolverPonto(v)])
    );
    const lampada = resolverPonto(p.lampada);
    // Se algum ponto (ou a lâmpada) caiu fora da janela de candles visível
    // agora, o padrão inteiro não aparece — evita desenhar pela metade.
    if(!lampada || Object.values(pontosResolvidos).some(v => !v)) return null;

    const indices = Object.values(pontosResolvidos).map(pt => pt.i);
    return {
      ...p,
      pontos: pontosResolvidos,
      lampada,
      intervalo_candles: { inicio: Math.min(...indices), fim: Math.max(...indices) },
    };
  }).filter(Boolean);
}

// Fibonacci — os 7 níveis clássicos de retração entre dois preços marcados
// pelo usuário (não é calculado a partir de candles, é geometria pura).
export const FIBO_NIVEIS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// ── Estilo das linhas de Suporte/Resistência (rank mais forte = mais nítido) ──
const NIVEL_COR = { suporte: "0,214,143", resistencia: "255,69,96" };
export const nivelChave = (nivel) => `${nivel.tipo}:${nivel.preco}`;
export const estiloNivel = (nivel, selecionado) => {
  const rgb = NIVEL_COR[nivel.tipo];
  if(selecionado) return { color:`rgba(${rgb},1)`, lineWidth:3 };
  const alpha = nivel.rank===0 ? 0.9 : 0.4;
  const lineWidth = nivel.rank===0 ? 2 : 1;
  return { color:`rgba(${rgb},${alpha})`, lineWidth };
};
