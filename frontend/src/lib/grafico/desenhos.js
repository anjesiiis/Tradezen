import { FIBO_NIVEIS } from "./padroes.js";
import { fmtP } from "../mercado.js";

// Marcador de resultado do padrão — bolinha colorida com um ícone
// vetorial (✓ sucesso, ✕ falhou, ponto pendente) desenhado no canvas.
// Substitui os antigos emojis 💡/❌/⏳/🎯, que destoavam do resto da
// interface (sem controle de cor/peso, ficavam grandes e infantis).
function _desenharMarcadorResultado(ctx, x, y, resultado, cor, raio=9){
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, raio, 0, Math.PI*2);
  ctx.fillStyle = cor;
  ctx.globalAlpha = 0.16;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = cor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  if(resultado === "sucesso"){
    ctx.beginPath();
    ctx.moveTo(x-raio*0.45, y+raio*0.02);
    ctx.lineTo(x-raio*0.1,  y+raio*0.4);
    ctx.lineTo(x+raio*0.5,  y-raio*0.35);
    ctx.stroke();
  } else if(resultado === "falhou"){
    ctx.beginPath();
    ctx.moveTo(x-raio*0.38, y-raio*0.38); ctx.lineTo(x+raio*0.38, y+raio*0.38);
    ctx.moveTo(x+raio*0.38, y-raio*0.38); ctx.lineTo(x-raio*0.38, y+raio*0.38);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, raio*0.24, 0, Math.PI*2);
    ctx.fillStyle = cor;
    ctx.fill();
  }
  ctx.restore();
}

export function _desenharOCO(ctx, toX, toY, p, isSel){
  const P = p.pontos;
  if(!P) return;

  // 7 pontos: F0 → OmbroEsq → Neck1 → Cabeça → Neck2 → OmbroDir → F_final
  // OCO tradicional: OE e OD são TOPOS, Neck1/Neck2 são FUNDOS, Cabeça é TOPO mais alto
  const pts    = [P.f0, P.ombro_esq, P.neck1, P.cabeca, P.neck2, P.ombro_dir, P.f_final];
  const labels = ["",   "Ombro",     "",      "Cabeça", "",      "Ombro",     ""];
  // true = label acima, false = abaixo
  const acima  = [false, true,       false,   true,     false,   true,        false];

  const coords = pts.map(pt => {
    if(!pt) return null;
    const x = toX(pt.i), y = toY(pt.preco);
    return (x == null || y == null) ? null : {x, y};
  });

  ctx.save();

  // ── ESTADO NÃO SELECIONADO: desenha SÓ o marcador do resultado ──
  const headC = coords[3];
  const resultado = p.resultado || "pendente";
  const corLinha = resultado === "sucesso" ? "#F5A623"
                 : resultado === "falhou"  ? "#FF2D55"
                 : "#888888";

  if(!isSel){
    if(headC){
      ctx.globalAlpha = resultado === "falhou" ? 0.7 : 1;
      _desenharMarcadorResultado(ctx, headC.x, headC.y - 30, resultado, corLinha, 8);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return;
  }

  // ── ESTADO SELECIONADO: desenha o padrão completo ────────────
  ctx.globalAlpha = 1;
  ctx.strokeStyle = corLinha;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = "round";
  ctx.setLineDash([8, 5]);
  ctx.shadowColor = resultado === "falhou" ? "rgba(255,45,85,0.5)" : "rgba(245,166,35,0.4)";
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  let started = false;
  for(const c of coords){
    if(!c){ started = false; continue; }
    if(!started){ ctx.moveTo(c.x, c.y); started = true; }
    else ctx.lineTo(c.x, c.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  // Marcador acima da cabeça
  if(headC){
    _desenharMarcadorResultado(ctx, headC.x, headC.y - 32, resultado, corLinha, 9);
  }

  // ── Pontos com labels (OE, Cabeça, OD) ───────────────────────
  for(let i = 1; i <= 5; i++){
    const c = coords[i];
    if(!c) continue;
    const isHead = i === 3;
    const radius = isHead ? 5 : 3.5;

    // círculo amarelo
    ctx.globalAlpha = 0.95;
    ctx.fillStyle   = "#F5A623";
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // label
    if(labels[i]){
      ctx.fillStyle    = "#FFFFFF";
      ctx.font         = `bold ${isHead ? 10 : 9}px 'JetBrains Mono',monospace`;
      ctx.textAlign    = "center";
      if(acima[i]){
        ctx.textBaseline = "bottom";
        ctx.fillText(labels[i], c.x, c.y - radius - 4);
      } else {
        ctx.textBaseline = "top";
        ctx.fillText(labels[i], c.x, c.y + radius + 4);
      }
    }
  }

  // ── Neckline tracejada entre neck1 e neck2 (sem estender muito) ──
  const n1 = coords[2], n2 = coords[4];
  if(n1 && n2){
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(200,216,247,0.55)";
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);
    ctx.lineTo(n2.x, n2.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#8B949E";
    ctx.font = "bold 9px 'JetBrains Mono',monospace";
    ctx.textAlign = "left";
    ctx.fillText("NECK " + fmtP(p.neckline), n2.x + 8, n2.y - 4);
  }

  ctx.restore();
}

// Desenho do Topo Duplo — mesma linguagem visual do OCO (lâmpada, linha
// tracejada, neckline), só que com 3 pontos (Topo 1 → Vale → Topo 2) em vez
// dos 7 do OCO.
export function _desenharTopoDuplo(ctx, toX, toY, p, isSel){
  const P = p.pontos;
  if(!P) return;

  const pts    = [P.topo1, P.vale, P.topo2];
  const labels = ["Topo 1", "Vale", "Topo 2"];

  const coords = pts.map(pt => {
    if(!pt) return null;
    const x = toX(pt.i), y = toY(pt.preco);
    return (x == null || y == null) ? null : {x, y};
  });

  ctx.save();

  const headC = coords[2]; // Topo 2 é a referência da lâmpada
  const resultado = p.resultado || "pendente";
  const corLinha = resultado === "sucesso" ? "#F5A623"
                 : resultado === "falhou"  ? "#FF2D55"
                 : "#888888";

  if(!isSel){
    if(headC){
      ctx.globalAlpha = resultado === "falhou" ? 0.7 : 1;
      _desenharMarcadorResultado(ctx, headC.x, headC.y - 30, resultado, corLinha, 8);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return;
  }

  ctx.globalAlpha = 1;
  ctx.strokeStyle = corLinha;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = "round";
  ctx.setLineDash([8, 5]);
  ctx.shadowColor = resultado === "falhou" ? "rgba(255,45,85,0.5)" : "rgba(245,166,35,0.4)";
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  let started = false;
  for(const c of coords){
    if(!c){ started = false; continue; }
    if(!started){ ctx.moveTo(c.x, c.y); started = true; }
    else ctx.lineTo(c.x, c.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  if(headC){
    _desenharMarcadorResultado(ctx, headC.x, headC.y - 32, resultado, corLinha, 9);
  }

  coords.forEach((c, i) => {
    if(!c) return;
    const isVale = i === 1;
    const radius = isVale ? 3.5 : 5;

    ctx.globalAlpha = 0.95;
    ctx.fillStyle   = "#F5A623";
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle    = "#FFFFFF";
    ctx.font         = `bold ${isVale ? 9 : 10}px 'JetBrains Mono',monospace`;
    ctx.textAlign    = "center";
    if(isVale){
      ctx.textBaseline = "top";
      ctx.fillText(labels[i], c.x, c.y + radius + 4);
    } else {
      ctx.textBaseline = "bottom";
      ctx.fillText(labels[i], c.x, c.y - radius - 4);
    }
  });

  // Neckline tracejada no preço do vale, entre os dois topos
  const valeC = coords[1];
  if(coords[0] && coords[2] && valeC){
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(200,216,247,0.55)";
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.moveTo(coords[0].x, valeC.y);
    ctx.lineTo(coords[2].x, valeC.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#8B949E";
    ctx.font = "bold 9px 'JetBrains Mono',monospace";
    ctx.textAlign = "left";
    ctx.fillText("NECK " + fmtP(P.vale.preco), coords[2].x + 8, valeC.y - 4);
  }

  ctx.restore();
}

// Desenho da Bandeira (alta/baixa) — mastro (linha sólida, início→fim) +
// canal de consolidação (as duas linhas tracejadas, topo1→topo2 e
// fundo1→fundo2), mesmos 6 pontos marcados no admin (ver STEPS/linePairs em
// AdminTemplatesBandeiraAlta/Baixa.jsx — aqui só redesenha o mesmo par de
// linhas no gráfico real).
export function _desenharBandeira(ctx, toX, toY, p, isSel){
  const P = p.pontos;
  if(!P) return;

  const par = (a, b) => {
    if(!a || !b) return null;
    const xa = toX(a.i), ya = toY(a.preco);
    const xb = toX(b.i), yb = toY(b.preco);
    return (xa==null || ya==null || xb==null || yb==null) ? null : {a:{x:xa,y:ya}, b:{x:xb,y:yb}};
  };
  const mastro = par(P.mastro_inicio, P.mastro_fim);
  const canalTopo = par(P.topo1, P.topo2);
  const canalFundo = par(P.fundo1, P.fundo2);
  const fimMastro = mastro?.b;

  ctx.save();

  const resultado = p.resultado || "pendente";
  const cor = resultado === "sucesso" ? "#F5A623" : resultado === "falhou" ? "#FF2D55" : "#888888";

  if(!isSel){
    if(fimMastro){
      ctx.globalAlpha = resultado === "falhou" ? 0.7 : 1;
      _desenharMarcadorResultado(ctx, fimMastro.x, fimMastro.y - 16, resultado, cor, 8);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return;
  }

  ctx.lineWidth = 2;
  ctx.lineJoin = "round";

  if(mastro){
    ctx.globalAlpha = 1;
    ctx.strokeStyle = cor;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(mastro.a.x, mastro.a.y);
    ctx.lineTo(mastro.b.x, mastro.b.y);
    ctx.stroke();
  }

  for(const canal of [canalTopo, canalFundo]){
    if(!canal) continue;
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "#3D7EFF";
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(canal.a.x, canal.a.y);
    ctx.lineTo(canal.b.x, canal.b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if(fimMastro){
    _desenharMarcadorResultado(ctx, fimMastro.x, fimMastro.y - 18, resultado, cor, 9);
  }

  for(const [key, pt] of Object.entries(P)){
    const x = toX(pt.i), y = toY(pt.preco);
    if(x==null || y==null) continue;
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = key.startsWith("mastro") ? cor : "#3D7EFF";
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.restore();
}

// Suporte/Resistência marcado manualmente — diferente da reta infinita do
// antigo detector automático, aqui é uma FAIXA sombreada limitada aos
// candles entre o primeiro e o último toque (igual a marcação no admin).
export function _desenharNivel(ctx, toX, toY, p, isSel){
  const toques = p.toquesResolvidos;
  if(!toques || toques.length < 2) return;

  const coords = toques.map(t => {
    const x = toX(t.i), y = toY(t.preco);
    return (x == null || y == null) ? null : {x, y, preco: t.preco};
  }).filter(Boolean);
  if(coords.length < 2) return;

  const precos = coords.map(c => c.preco);
  const precoMin = Math.min(...precos), precoMax = Math.max(...precos);
  const xMin = Math.min(...coords.map(c => c.x));
  const xMax = Math.max(...coords.map(c => c.x));
  const yTopo = toY(precoMax);
  const yFundo = toY(precoMin);
  if(yTopo == null || yFundo == null) return;

  ctx.save();

  const resultado = p.resultado || "pendente";
  // Suporte/Resistência não tem "resultado" no sentido de padrão confirmado
  // ou não (o texto marcado é tipo "Suporte", "Suporte muito forte" — nunca
  // bate com "sucesso"/"falhou"), então o marcador sempre cai no caso
  // padrão (bolinha), que combina mais com "nível de preço visado" do que
  // com "aguardando resultado".
  const cor = p.tipo === "resistencia" ? "#00D68F" : "#FF4560";
  const lampC = coords[coords.length - 1];

  if(!isSel){
    if(lampC){
      ctx.globalAlpha = resultado === "falhou" ? 0.7 : 1;
      _desenharMarcadorResultado(ctx, lampC.x, yTopo - 16, resultado, cor, 8);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    return;
  }

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = cor;
  ctx.fillRect(xMin, yTopo, xMax - xMin, Math.max(1, yFundo - yTopo));

  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = cor;
  ctx.lineWidth = 1.3;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(xMin, yTopo, xMax - xMin, Math.max(1, yFundo - yTopo));
  ctx.setLineDash([]);

  coords.forEach(c => {
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  if(lampC){
    _desenharMarcadorResultado(ctx, lampC.x, yTopo - 18, resultado, cor, 9);
  }

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#8B949E";
  ctx.font = "bold 9px 'JetBrains Mono',monospace";
  ctx.textAlign = "left";
  ctx.fillText(`${p.nome} ${fmtP(precoMin)}–${fmtP(precoMax)}`, xMax + 8, (yTopo + yFundo) / 2);

  ctx.restore();
}

// Fibonacci — desenhado a partir de 2 pontos que o próprio usuário marcou no
// gráfico (fibo = {a:{i,preco}, b:{i,preco}}), não vem de padrão nenhum.
// As linhas vão do ponto mais antigo até a borda direita do canvas — jeito
// clássico de projetar os níveis pra frente no tempo.
export function _desenharFibonacci(ctx, toX, toY, fibo, canvasWidth){
  const { a, b } = fibo;
  const xA = toX(a.i);
  if(xA == null) return;

  const precoAlto = Math.max(a.preco, b.preco);
  const precoBaixo = Math.min(a.preco, b.preco);
  const amplitude = precoAlto - precoBaixo;
  if(amplitude <= 0) return;

  ctx.save();
  ctx.font = "bold 9px 'JetBrains Mono',monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  FIBO_NIVEIS.forEach(nivel => {
    // 0% sempre no preço mais alto dos dois pontos, 100% no mais baixo —
    // convenção padrão de retração.
    const preco = precoAlto - amplitude*nivel;
    const y = toY(preco);
    if(y == null) return;

    const destaque = nivel === 0 || nivel === 1 || nivel === 0.5;
    ctx.globalAlpha = destaque ? 0.85 : 0.55;
    ctx.strokeStyle = "#F5A623";
    ctx.lineWidth = destaque ? 1.3 : 1;
    ctx.setLineDash(nivel === 0 || nivel === 1 ? [] : [5,4]);
    ctx.beginPath();
    ctx.moveTo(xA, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#F5A623";
    ctx.fillText(`${(nivel*100).toFixed(1)}% · ${fmtP(preco)}`, xA + 6, y - 8);
  });

  ctx.setLineDash([]);
  ctx.restore();
}

// ── Ferramentas de desenho (usuário) ─────────────────────────
// Cor única pros 4 desenhos livres (trend/horizontal/retângulo/canal) — o
// Fibonacci continua laranja (já existia antes, ver _desenharFibonacci acima).
const DESENHO_COR  = "#2962ff";
const DESENHO_FILL = "rgba(41,98,255,0.1)";

// Metadados de cada ferramenta de desenho por clique (quantos pontos precisa
// e o texto de dica mostrado enquanto o usuário ainda não terminou de
// clicar). "fibo" fica de fora — continua no mecanismo antigo
// (tools/activeTools), só ganha um ícone novo na lista pra aparecer junto.
export const FERRAMENTA_INFO = {
  trend: {
    npontos: 2,
    hints: ["Linha de Tendência: clique no 1º ponto", "Linha de Tendência: clique no 2º ponto"],
  },
  horizontal: {
    npontos: 1,
    hints: ["Linha Horizontal: clique no gráfico pra fixar o preço"],
  },
  retangulo_desenho: {
    npontos: 2,
    hints: ["Retângulo: clique no 1º canto", "Retângulo: clique no canto oposto"],
  },
  canal: {
    npontos: 3,
    hints: ["Canal Paralelo: clique no 1º ponto da linha base", "Canal Paralelo: clique no 2º ponto da linha base", "Canal Paralelo: clique pra definir a largura"],
  },
  texto: {
    npontos: 1,
    hints: ["Texto: clique no gráfico pra escolher onde escrever"],
  },
  regua: {
    npontos: 2,
    hints: ["Régua: clique no ponto inicial", "Régua: clique no ponto final pra medir"],
  },
};

function _desenharHandle(ctx, x, y, cor){
  ctx.save();
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

// Distância de um ponto (px,py) até o segmento (x1,y1)-(x2,y2) — usado pra
// achar qual desenho está sob o cursor no clique direito (mais tolerante
// que testar só os pontos/handles).
export function _distPontoSegmento(px, py, x1, y1, x2, y2){
  const dx = x2-x1, dy = y2-y1;
  const lenSq = dx*dx + dy*dy;
  let t = lenSq === 0 ? 0 : ((px-x1)*dx + (py-y1)*dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t*dx, projY = y1 + t*dy;
  return Math.hypot(px-projX, py-projY);
}

function _desenharTrend(ctx, toX, toY, pontos, isSel, canvasWidth){
  if(pontos.length<2) return;
  const x1=toX(pontos[0].logical), y1=toY(pontos[0].preco);
  const x2=toX(pontos[1].logical), y2=toY(pontos[1].preco);
  if([x1,y1,x2,y2].some(v=>v==null)) return;
  const [xL,yL,xR,yR] = x1<=x2 ? [x1,y1,x2,y2] : [x2,y2,x1,y1];
  const m = xR!==xL ? (yR-yL)/(xR-xL) : 0;
  const xEnd = canvasWidth;
  const yEnd = yR + m*(xEnd-xR);

  ctx.save();
  ctx.strokeStyle = DESENHO_COR;
  ctx.lineWidth = isSel?3:2;
  ctx.beginPath();
  ctx.moveTo(xL,yL);
  ctx.lineTo(xEnd,yEnd);
  ctx.stroke();
  ctx.restore();
  _desenharHandle(ctx,x1,y1,DESENHO_COR);
  _desenharHandle(ctx,x2,y2,DESENHO_COR);
}

function _desenharHorizontal(ctx, toY, pontos, isSel, canvasWidth){
  if(pontos.length<1) return;
  const y = toY(pontos[0].preco);
  if(y==null) return;
  ctx.save();
  ctx.strokeStyle = DESENHO_COR;
  ctx.lineWidth = isSel?3:2;
  ctx.beginPath();
  ctx.moveTo(0,y);
  ctx.lineTo(canvasWidth,y);
  ctx.stroke();
  ctx.font = "bold 10px 'JetBrains Mono',monospace";
  ctx.fillStyle = DESENHO_COR;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(fmtP(pontos[0].preco), canvasWidth-6, y-4);
  ctx.restore();
}

function _desenharRetanguloDesenho(ctx, toX, toY, pontos, isSel){
  if(pontos.length<2) return;
  const x1=toX(pontos[0].logical), y1=toY(pontos[0].preco);
  const x2=toX(pontos[1].logical), y2=toY(pontos[1].preco);
  if([x1,y1,x2,y2].some(v=>v==null)) return;
  const x=Math.min(x1,x2), y=Math.min(y1,y2), w=Math.abs(x2-x1), h=Math.abs(y2-y1);
  ctx.save();
  ctx.fillStyle = DESENHO_FILL;
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle = DESENHO_COR;
  ctx.lineWidth = isSel?2.5:1.5;
  ctx.strokeRect(x,y,w,h);
  ctx.restore();
  _desenharHandle(ctx,x1,y1,DESENHO_COR);
  _desenharHandle(ctx,x2,y2,DESENHO_COR);
}

function _desenharCanal(ctx, toX, toY, pontos, isSel, canvasWidth){
  if(pontos.length<3) return;
  const x1=toX(pontos[0].logical), y1=toY(pontos[0].preco);
  const x2=toX(pontos[1].logical), y2=toY(pontos[1].preco);
  const x3=toX(pontos[2].logical), y3=toY(pontos[2].preco);
  if([x1,y1,x2,y2,x3,y3].some(v=>v==null)) return;
  const [xL,yL,xR,yR] = x1<=x2 ? [x1,y1,x2,y2] : [x2,y2,x1,y1];
  const m = xR!==xL ? (yR-yL)/(xR-xL) : 0;
  const xEnd = canvasWidth;
  const yBaseEnd = yR + m*(xEnd-xR);
  const yBaseAtX3 = yL + m*(x3-xL);
  const offset = y3 - yBaseAtX3;

  ctx.save();
  ctx.fillStyle = DESENHO_FILL;
  ctx.beginPath();
  ctx.moveTo(xL,yL);
  ctx.lineTo(xEnd,yBaseEnd);
  ctx.lineTo(xEnd,yBaseEnd+offset);
  ctx.lineTo(xL,yL+offset);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = DESENHO_COR;
  ctx.lineWidth = isSel?3:2;
  ctx.beginPath(); ctx.moveTo(xL,yL); ctx.lineTo(xEnd,yBaseEnd); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(xL,yL+offset); ctx.lineTo(xEnd,yBaseEnd+offset); ctx.stroke();
  ctx.restore();

  _desenharHandle(ctx,x1,y1,DESENHO_COR);
  _desenharHandle(ctx,x2,y2,DESENHO_COR);
  _desenharHandle(ctx,x3,y3,DESENHO_COR);
}

function _desenharTexto(ctx, toX, toY, pontos, texto, isSel){
  if(pontos.length<1 || !texto) return;
  const x=toX(pontos[0].logical), y=toY(pontos[0].preco);
  if(x==null || y==null) return;
  ctx.save();
  ctx.font = "600 13px 'DM Sans',sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const largura = ctx.measureText(texto).width;
  const padX = 7, padY = 5;
  const bx = x-padX, by = y-9-padY, bw = largura+padX*2, bh = 18+padY*2;
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(bx,by,bw,bh,5); else ctx.rect(bx,by,bw,bh);
  ctx.fillStyle = "rgba(6,8,15,.78)";
  ctx.fill();
  if(isSel){ ctx.strokeStyle = DESENHO_COR; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.fillStyle = "#fff";
  ctx.fillText(texto, x, y);
  ctx.restore();
  _desenharHandle(ctx,x,y,DESENHO_COR);
}

// Régua/medição — estilo TradingView: mede a distância entre 2 pontos e
// mostra variação de preço (absoluta + %) e quantas velas o movimento
// abrange. Cor muda conforme a direção (verde subindo, vermelho descendo),
// igual ao resto do app.
function _desenharRegua(ctx, toX, toY, pontos, isSel, canvasWidth){
  if(pontos.length<2) return;
  const x1=toX(pontos[0].logical), y1=toY(pontos[0].preco);
  const x2=toX(pontos[1].logical), y2=toY(pontos[1].preco);
  if([x1,y1,x2,y2].some(v=>v==null)) return;

  const p1 = pontos[0].preco, p2 = pontos[1].preco;
  const delta = p2-p1;
  const pct = p1 ? (delta/p1)*100 : 0;
  const subiu = delta>=0;
  const cor = subiu ? "#00D68F" : "#FF4560";

  const x=Math.min(x1,x2), y=Math.min(y1,y2), w=Math.abs(x2-x1), h=Math.abs(y2-y1);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = cor;
  ctx.fillRect(x,y,w,h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = cor;
  ctx.lineWidth = isSel?2:1.5;
  ctx.setLineDash([5,4]);
  ctx.strokeRect(x,y,w,h);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
  ctx.lineWidth = isSel?2.5:1.5;
  ctx.stroke();
  ctx.restore();

  _desenharHandle(ctx,x1,y1,cor);
  _desenharHandle(ctx,x2,y2,cor);

  const nBarras = Math.round(Math.abs(pontos[1].logical - pontos[0].logical));
  const linha1 = `${subiu?"+":""}${fmtP(delta)} (${subiu?"+":""}${pct.toFixed(2)}%)`;
  const linha2 = `${nBarras} vela${nBarras===1?"":"s"}`;

  ctx.save();
  ctx.font = "800 12px 'JetBrains Mono',monospace";
  const largura = Math.max(ctx.measureText(linha1).width, 70);
  const padX=8, padY=6;
  let bx = Math.max(x1,x2)+10;
  const by = Math.min(y1,y2);
  const bw = largura+padX*2, bh = 34+padY;
  if(bx+bw > canvasWidth) bx = Math.min(x1,x2)-10-bw; // sem espaço à direita → mostra à esquerda
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(bx,by,bw,bh,6); else ctx.rect(bx,by,bw,bh);
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.fillStyle = "#0a0a0f";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(linha1, bx+padX, by+padY);
  ctx.font = "600 10px 'JetBrains Mono',monospace";
  ctx.fillText(linha2, bx+padX, by+padY+16);
  ctx.restore();
}

// Ponto-âncora do "x" de fechar rápido de cada linha — função pura (só
// recebe os conversores de coordenada), usada tanto no desenho (canvas, via
// toLogX/toPrecoY do effect de render) quanto no teste de clique (via
// chart.timeScale()/series diretos, no effect de interação) — assim as duas
// pontas concordam sempre sobre onde o botão fica, sem duplicar a regra.
export function _anchorFechar(d, toX, toY, canvasWidth){
  if(d.tipo==="horizontal"){
    const y = toY(d.pontos[0].preco);
    return y==null ? null : { x: canvasWidth-22, y };
  }
  const p0 = d.pontos[0];
  const x = toX(p0.logical), y = toY(p0.preco);
  if(x==null || y==null) return null;
  return d.tipo==="texto" ? { x:x+8, y:y-24 } : { x, y:y-14 };
}

export function _desenharBotaoFechar(ctx, x, y){
  const r = 8;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.fillStyle = "rgba(6,8,15,.82)";
  ctx.fill();
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = "#8B949E";
  ctx.stroke();
  const k = r*0.4;
  ctx.beginPath();
  ctx.moveTo(x-k,y-k); ctx.lineTo(x+k,y+k);
  ctx.moveTo(x+k,y-k); ctx.lineTo(x-k,y+k);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

// Despacha pro desenho certo conforme `d.tipo`. `toLogX`/`toPrecoY` convertem
// logical-index/preço pra pixel (ver comentário no redraw() do CandleChart
// sobre por que usamos coordenada lógica em vez de tempo — permite
// desenhar além do último candle, ex: linha de tendência se estendendo
// pro futuro).
// `preview`: true enquanto o usuário ainda está arrastando o mouse antes do
// clique final (ver comentário no redraw() do CandleChart) — desenha
// tracejado/translúcido pra distinguir do desenho já confirmado.
export function _desenharDesenhoUsuario(ctx, toLogX, toPrecoY, d, isSel, canvasWidth, preview=false){
  if(preview){ ctx.save(); ctx.globalAlpha = 0.55; ctx.setLineDash([6,4]); }
  if(d.tipo==="trend")      _desenharTrend(ctx, toLogX, toPrecoY, d.pontos, isSel, canvasWidth);
  else if(d.tipo==="horizontal") _desenharHorizontal(ctx, toPrecoY, d.pontos, isSel, canvasWidth);
  else if(d.tipo==="retangulo_desenho") _desenharRetanguloDesenho(ctx, toLogX, toPrecoY, d.pontos, isSel);
  else if(d.tipo==="canal")  _desenharCanal(ctx, toLogX, toPrecoY, d.pontos, isSel, canvasWidth);
  else if(d.tipo==="texto")  _desenharTexto(ctx, toLogX, toPrecoY, d.pontos, d.texto, isSel);
  else if(d.tipo==="regua")  _desenharRegua(ctx, toLogX, toPrecoY, d.pontos, isSel, canvasWidth);
  if(preview){ ctx.restore(); }
}
