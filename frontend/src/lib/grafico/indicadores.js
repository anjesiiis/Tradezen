// ── Converte candles do backend pro formato Lightweight Charts ──
export const toLWCandles = (candles) =>
  candles.map(c => ({
    time: Math.floor(c.timestamp / 1000),
    open:  c.abertura,
    high:  c.maxima,
    low:   c.minima,
    close: c.fechamento,
  })).sort((a,b) => a.time - b.time);

export const toLWSeries = (candles) =>
  candles.map(c => ({
    time:  Math.floor(c.timestamp / 1000),
    value: c.fechamento,
  })).sort((a,b) => a.time - b.time);

// ── Cálculo dos indicadores técnicos ──────────────────────────
// Todas recebem `sorted` (candles já ordenados por timestamp crescente,
// o chamador garante isso) e devolvem série(s) no formato do Lightweight
// Charts ({time, value}). Tudo client-side, direto do OHLCV — sem
// depender do backend/ML.

// RSI (Wilder) — período 14 por padrão.
export function calcularRSI(sorted, periodo=14){
  if(sorted.length < periodo+1) return [];
  const closes = sorted.map(c=>c.fechamento);
  let ganho=0, perda=0;
  for(let i=1;i<=periodo;i++){
    const diff = closes[i]-closes[i-1];
    if(diff>=0) ganho+=diff; else perda-=diff;
  }
  let mediaGanho = ganho/periodo, mediaPerda = perda/periodo;
  const rsiDe = (mg,mp)=> mp===0 ? 100 : 100-(100/(1+mg/mp));
  const out = [{ time: Math.floor(sorted[periodo].timestamp/1000), value: rsiDe(mediaGanho,mediaPerda) }];
  for(let i=periodo+1;i<closes.length;i++){
    const diff = closes[i]-closes[i-1];
    mediaGanho = (mediaGanho*(periodo-1) + Math.max(diff,0))/periodo;
    mediaPerda = (mediaPerda*(periodo-1) + Math.max(-diff,0))/periodo;
    out.push({ time: Math.floor(sorted[i].timestamp/1000), value: rsiDe(mediaGanho,mediaPerda) });
  }
  return out;
}

// Estocástico — %K bruto (period 14) suavizado por SMA3, e %D = SMA3 do %K.
export function calcularEstocastico(sorted, periodoK=14, suavK=3, periodoD=3){
  if(sorted.length < periodoK) return { k: [], d: [] };
  const bruto = [];
  for(let i=periodoK-1; i<sorted.length; i++){
    const janela = sorted.slice(i-periodoK+1, i+1);
    const maxima = Math.max(...janela.map(c=>c.maxima));
    const minima = Math.min(...janela.map(c=>c.minima));
    const valor = maxima===minima ? 50 : (sorted[i].fechamento-minima)/(maxima-minima)*100;
    bruto.push({ time: Math.floor(sorted[i].timestamp/1000), value: valor });
  }
  const suavizar = (serie, periodo) => {
    const out = [];
    for(let i=periodo-1; i<serie.length; i++){
      const media = serie.slice(i-periodo+1, i+1).reduce((s,p)=>s+p.value,0)/periodo;
      out.push({ time: serie[i].time, value: media });
    }
    return out;
  };
  const k = suavizar(bruto, suavK);
  const d = suavizar(k, periodoD);
  return { k, d };
}

// ATR (Wilder) — período 14 por padrão.
export function calcularATR(sorted, periodo=14){
  if(sorted.length < periodo+1) return [];
  const trs = [];
  for(let i=1; i<sorted.length; i++){
    const atual = sorted[i], anterior = sorted[i-1];
    trs.push(Math.max(
      atual.maxima - atual.minima,
      Math.abs(atual.maxima - anterior.fechamento),
      Math.abs(atual.minima - anterior.fechamento),
    ));
  }
  let media = trs.slice(0, periodo).reduce((s,v)=>s+v,0)/periodo;
  const out = [{ time: Math.floor(sorted[periodo].timestamp/1000), value: media }];
  for(let i=periodo; i<trs.length; i++){
    media = (media*(periodo-1) + trs[i])/periodo;
    out.push({ time: Math.floor(sorted[i+1].timestamp/1000), value: media });
  }
  return out;
}

// Volume médio (SMA do volume, período 20).
export function calcularVolumeMA(sorted, periodo=20){
  const out = [];
  for(let i=periodo-1; i<sorted.length; i++){
    const media = sorted.slice(i-periodo+1, i+1).reduce((s,c)=>s+(c.volume||0),0)/periodo;
    out.push({ time: Math.floor(sorted[i].timestamp/1000), value: media });
  }
  return out;
}

// VWAP — como só temos candle diário (sem sessão intradiária pra ancorar),
// é uma acumulada desde o primeiro candle carregado. Com "max" de histórico
// isso vira uma média de prazo bem longo lá pro fim da série — ainda assim
// serve de referência de "preço médio ponderado por volume" do período todo.
export function calcularVWAP(sorted){
  let cumPV=0, cumVol=0;
  return sorted.map(c=>{
    const tipico = (c.maxima+c.minima+c.fechamento)/3;
    cumPV += tipico*(c.volume||0);
    cumVol += (c.volume||0);
    return { time: Math.floor(c.timestamp/1000), value: cumVol>0 ? cumPV/cumVol : tipico };
  });
}

// OBV — On-Balance Volume, acumulado.
export function calcularOBV(sorted){
  let obv=0;
  return sorted.map((c,i)=>{
    if(i>0){
      if(c.fechamento > sorted[i-1].fechamento) obv += c.volume||0;
      else if(c.fechamento < sorted[i-1].fechamento) obv -= c.volume||0;
    }
    return { time: Math.floor(c.timestamp/1000), value: obv };
  });
}
