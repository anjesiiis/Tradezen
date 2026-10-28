import { FIBO_NIVEIS } from "./padroes.js";
import { FERRAMENTAS_PERSONALIZAVEIS, TRACOS, fonteDoCanvas, ladoDosRotulos, normalizarEstilo } from "./estiloDesenho.js";
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
  // Preço da reta que passa por dois pontos, no índice `i` (extrapola)
  const naReta = (a, b, i) => b.i === a.i ? a.preco : a.preco + ((b.preco - a.preco) * (i - a.i)) / (b.i - a.i);

  // Marcação nova: 6 pontos em ordem cronológica (ver admin/bandeira.js).
  // O formato antigo (mastro + 2 topos + 2 fundos do canal) continua
  // desenhando do jeito de antes — templates salvos não mudam de cara.
  const novo = ["p1_inicio_mastro","p2_topo_mastro","p3_fundo1","p4_topo1","p5_fundo2","p6_rompimento"].every(k => P[k]);

  // Formato atual da bandeira de ALTA: 8 pontos em 4 pares independentes,
  // cada par uma linha (mastro 1, fundo e topo do canal, mastro 2).
  const pares = ["p1_inicio_mastro1","p2_topo_mastro1","p3_inicio_fundo","p4_fim_fundo",
                 "p5_inicio_topo","p6_fim_topo","p7_inicio_mastro2","p8_topo_mastro2"].every(k => P[k]);

  let mastro, canalTopo, canalFundo, alvo;
  if(pares){
    mastro     = par(P.p1_inicio_mastro1, P.p2_topo_mastro1);
    canalFundo = par(P.p3_inicio_fundo, P.p4_fim_fundo);
    canalTopo  = par(P.p5_inicio_topo, P.p6_fim_topo);
    alvo       = par(P.p7_inicio_mastro2, P.p8_topo_mastro2);
  } else if(novo){
    const {p1_inicio_mastro:p1, p2_topo_mastro:p2, p3_fundo1:p3, p4_topo1:p4, p5_fundo2:p5, p6_rompimento:p6} = P;
    mastro     = par(p1, p2);
    // canal esticado até o candle do rompimento
    canalTopo  = par(p2, { i:p6.i, preco: naReta(p2, p4, p6.i) });
    canalFundo = par(p3, { i:p6.i, preco: naReta(p3, p5, p6.i) });
    // alvo: a altura do mastro projetada a partir do rompimento
    alvo = par(p6, { i: p6.i + Math.max(1, p2.i - p1.i), preco: p6.preco + (p2.preco - p1.preco) });
  } else {
    mastro     = par(P.mastro_inicio, P.mastro_fim);
    canalTopo  = par(P.topo1, P.topo2);
    canalFundo = par(P.fundo1, P.fundo2);
  }
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

  // Mastro e alvo em verde, canal em azul (mesmas cores da marcação no
  // admin, pra o padrão ser reconhecido na hora nas duas telas)
  for(const linha of [mastro, alvo]){
    if(!linha) continue;
    // No formato em pares o "alvo" é o mastro 2 de verdade (marcado pelo
    // analista), então é linha cheia; nos formatos antigos ele é uma
    // projeção calculada, e aí vai tracejado e mais apagado.
    const projetado = linha === alvo && !pares;
    ctx.globalAlpha = projetado ? 0.75 : 1;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#26a69a";
    ctx.setLineDash(projetado ? [7, 5] : []);
    ctx.beginPath();
    ctx.moveTo(linha.a.x, linha.a.y);
    ctx.lineTo(linha.b.x, linha.b.y);
    ctx.stroke();
  }

  for(const canal of [canalTopo, canalFundo]){
    if(!canal) continue;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#2962ff";
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
    const doMastro = pares
      ? /^(p1_|p2_|p7_|p8_)/.test(key)
      : key.startsWith("mastro") || key.startsWith("p1_") || key.startsWith("p2_") || key.startsWith("p6_");
    ctx.fillStyle = doMastro ? "#26a69a" : "#2962ff";
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

// Fibonacci — dois pontos marcados pelo usuário. O PRIMEIRO clique é o
// 0% e o segundo é o 100%: a retração se lê na direção em que ela
// aconteceu, então clicar no topo e depois no fundo dá o contrário de
// clicar no fundo e depois no topo. Antes o 0% ia sempre no preço mais
// alto dos dois, e o desenho saía invertido pra metade dos casos.
//
// As linhas vão do ponto mais antigo até a borda direita do canvas — jeito
// clássico de projetar os níveis pra frente no tempo.
/**
 * Etiqueta com uma pílula escura atrás.
 *
 * Sem o fundo, o texto some em cima dos candles — que é exatamente o
 * lugar onde ele cai, já que as linhas do Fibonacci atravessam o
 * movimento medido. Devolve a largura ocupada, pra quem precisa saber
 * se a etiqueta cabe antes de pintar.
 */
export function _rotuloComFundo(ctx, texto, x, y, alinhamento, cor){
  const larg = ctx.measureText(texto).width;
  const folga = 4, altura = 14;
  const xCaixa = alinhamento === "right" ? x - larg : x;

  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = "rgba(6,8,15,0.92)";
  ctx.fillRect(xCaixa - folga, y - altura/2, larg + folga*2, altura);
  ctx.globalAlpha = 1;
  ctx.fillStyle = cor;
  ctx.textAlign = alinhamento;
  ctx.textBaseline = "middle";
  ctx.fillText(texto, x, y);
  ctx.restore();
  return larg + folga*2;
}

export function _desenharFibonacci(ctx, toX, toY, pontos, isSel, canvasWidth){
  if(!pontos || pontos.length < 2) return;
  const [a, b] = pontos;
  const xA = toX(a.logical), xB = toX(b.logical);
  if(xA == null || xB == null) return;

  const amplitude = b.preco - a.preco;   // sinal importa: define o sentido
  if(amplitude === 0) return;
  // As linhas vão de um clique ao outro e PARAM. Antes seguiam até a
  // borda direita do canvas: quem media um movimento no meio do gráfico
  // via sete linhas atravessando tudo o que veio depois, tapando os
  // candles que não tinham nada a ver com a medição.
  const xIni = Math.min(xA, xB);
  const xFim = Math.max(xA, xB);

  ctx.save();
  ctx.font = "bold 10px 'JetBrains Mono',monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  // De que lado as etiquetas ficam. Em `auto` é do lado com espaço — e o
  // lado sem espaço é sempre o direito, onde fica o eixo de preço.
  const lado = ladoDosRotulos(_estilo?.ladoRotulos, xA, xB, canvasWidth);

  // Quais níveis aparecem é escolha de quem usa (ver estiloDesenho). Quem
  // só quer 50% e 61,8% desliga o resto, e o desenho para de virar sete
  // linhas em cima dos candles. 0% e 100% ficam sempre.
  const niveis = _estilo?.niveis || FIBO_NIVEIS;
  niveis.forEach(nivel => {
    const preco = a.preco + amplitude*nivel;
    const y = toY(preco);
    if(y == null) return;

    const destaque = nivel === 0 || nivel === 1 || nivel === 0.5;
    ctx.globalAlpha = destaque ? 0.85 : 0.55;
    ctx.strokeStyle = _cor(FIBO_COR);
    ctx.lineWidth = (_estilo?.espessura ?? 1) * (destaque ? 1.3 : 1) * (isSel ? 2 : 1);
    ctx.setLineDash(nivel === 0 || nivel === 1 ? [] : [5,4]);
    ctx.beginPath();
    ctx.moveTo(xIni, y);
    ctx.lineTo(xFim, y);
    ctx.stroke();

    ctx.globalAlpha = 1;
    const texto = `${(nivel*100).toFixed(1)}% · ${fmtP(preco)}`;
    if(lado === "direita"){
      // Encostada na ponta direita do desenho. Se o gráfico acabar antes
      // dela, volta pra dentro em vez de ser pintada pela metade.
      const larg = ctx.measureText(texto).width + 8;
      const cabe = canvasWidth ? xFim + 6 + larg <= canvasWidth : true;
      if(cabe) _rotuloComFundo(ctx, texto, xFim + 6, y, "left", _cor(FIBO_COR));
      else     _rotuloComFundo(ctx, texto, canvasWidth - 4, y, "right", _cor(FIBO_COR));
    } else {
      const larg = ctx.measureText(texto).width + 8;
      const cabe = xIni - 6 - larg >= 0;
      if(cabe) _rotuloComFundo(ctx, texto, xIni - 6, y, "right", _cor(FIBO_COR));
      else     _rotuloComFundo(ctx, texto, 4, y, "left", _cor(FIBO_COR));
    }
  });

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  _desenharHandle(ctx, xA, toY(a.preco), _cor(FIBO_COR));
  _desenharHandle(ctx, xB, toY(b.preco), _cor(FIBO_COR));
  ctx.restore();
}

// ── Ferramentas de desenho (usuário) ─────────────────────────
// Cor única pros 4 desenhos livres (trend/horizontal/retângulo/canal) — o
// Fibonacci continua laranja (já existia antes, ver _desenharFibonacci acima).
/**
 * Terceiro ponto do canal, calculado em vez de clicado.
 *
 * A linha base são os dois pontos que o usuário marcou. A paralela passa
 * pelo candle que mais se afasta dessa base entre eles — o maior pico se
 * os dois cliques foram em fundos, o maior fundo se foram em topos. É o
 * sinal do desvio que decide o lado, então o canal nunca sai invertido.
 *
 * Devolve null quando não há candle entre os dois pontos: aí o canal fica
 * só com a linha base, em vez de inventar uma largura.
 */
export function pontoDaParalela(a, b, candles){
  if(!a || !b || !candles?.length) return null;
  const iA = Math.round(a.logical), iB = Math.round(b.logical);
  const ini = Math.max(0, Math.min(iA, iB));
  const fim = Math.min(candles.length-1, Math.max(iA, iB));
  if(fim <= ini) return null;

  const dx = b.logical - a.logical;
  const m = dx !== 0 ? (b.preco - a.preco)/dx : 0;
  const naBase = (i) => a.preco + m*(i - a.logical);

  let melhor = null;
  for(let i=ini; i<=fim; i++){
    const c = candles[i];
    if(!c) continue;
    const base = naBase(i);
    // `maxima`/`minima`, que é como o candle chega do backend. NÃO é
    // high/low: esses só existem na cópia que vai pro Lightweight Charts
    // (toLWCandles), e aqui o que chega é o candle cru. Com os nomes
    // errados os dois lados vinham undefined, nenhum candle entrava na
    // conta, a função devolvia null — e o canal saía com uma linha só.
    for(const preco of [c.maxima, c.minima]){
      if(preco == null) continue;
      const desvio = preco - base;
      if(!melhor || Math.abs(desvio) > Math.abs(melhor.desvio)){
        melhor = { logical:i, preco, desvio };
      }
    }
  }
  if(!melhor || melhor.desvio === 0) return null;
  return { logical: melhor.logical, preco: melhor.preco };
}

const DESENHO_COR  = "#2962ff";
const FIBO_COR     = "#F5A623";
const DESENHO_FILL = "rgba(41,98,255,0.1)";

// ── Estilo do desenho que está sendo pintado agora ──────────────────
//
// Mora no módulo, e não num parâmetro, porque são doze funções de desenho
// e passar um objeto de config por todas elas só pra ler a cor encheria
// cada assinatura de ruído. `_desenharDesenhoUsuario` liga antes e desliga
// depois — nenhuma delas é chamada de fora dele.
let _estilo = null;

/** A cor do desenho atual, ou o azul de sempre quando não há estilo. */
function _cor(padrao = DESENHO_COR){ return _estilo?.cor || padrao; }

/** A espessura escolhida; selecionado fica 1px mais grosso. */
function _lw(isSel, padrao = 2){
  const base = _estilo?.espessura ?? padrao;
  return isSel ? base + 1 : base;
}

/** O traço escolhido (sólido/tracejado/pontilhado). */
function _dash(padrao = []){
  const t = _estilo?.traco;
  return t && TRACOS[t] ? TRACOS[t] : padrao;
}

/** Mesma cor, com transparência — o preenchimento do retângulo. */
function _corFill(alpha = 0.1, padrao = DESENHO_FILL){
  const c = _estilo?.cor;
  if(!c) return padrao;
  const hex = c.replace("#","");
  if(hex.length !== 6) return padrao;
  const n = parseInt(hex, 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

// Metadados de cada ferramenta de desenho por clique (quantos pontos precisa
// e o texto de dica mostrado enquanto o usuário ainda não terminou de
// clicar).
//
// O Fibonacci entrou aqui: ele vivia num mecanismo próprio (o Set
// `tools` + subscribeClick com `param.time`), e por isso só registrava o
// ponto se o clique caísse exatamente em cima de um candle — clicar no
// espaço vazio à direita não fazia nada. Agora é ferramenta como as
// outras: coordenada lógica, preview, desfazer, seleção e vários na
// mesma tela.
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
  // 2 cliques: os dois pontos são a linha base. A paralela sai calculada
  // do maior desvio entre eles (ver larguraDoCanal) — pedir um 3º clique
  // pra "definir a largura" era trabalho que o próprio gráfico já sabe
  // fazer, e o usuário clicava no lugar errado.
  // `arrasta`: dá pra desenhar segurando e puxando, sem soltar — é o
  // gesto natural no celular, onde tocar duas vezes no lugar certo é
  // difícil. Os dois cliques continuam valendo pra quem prefere: o
  // mouseup decide qual foi pela distância percorrida.
  // 3 cliques, como no TradingView: os dois primeiros são a linha base e
  // o terceiro diz ONDE a paralela fica — acima ou abaixo, e a que
  // distância. Era 2 cliques, com a largura saída do maior desvio dos
  // candles; o dono preferiu escolher a largura na mão, que é o gesto que
  // quem vem de outra plataforma já tem no dedo.
  // `arrasta`: puxar de um ponto ao outro desenha a base sem soltar o
  // dedo (gesto do celular) e deixa o 3º clique pra largura.
  canal: {
    npontos: 3,
    arrasta: true,
    hints: [
      "Canal: arraste de um ponto ao outro (ou clique nos dois)",
      "Canal: clique no 2º ponto da linha base",
      // No celular não existe "mover sem tocar": entre um toque e o
      // seguinte o dedo está no ar. Lá a largura se escolhe arrastando, e
      // soltar fixa — a dica tem que caber nos dois gestos.
      "Canal: arraste a paralela (ou clique) pra fixar a largura",
    ],
  },
  fibo: {
    npontos: 2,
    hints: ["Fibonacci: clique no 0% (início do movimento)", "Fibonacci: clique no 100% (fim do movimento)"],
  },
  vertical: {
    npontos: 1,
    hints: ["Linha Vertical: clique no candle que você quer marcar"],
  },
  triangulo_desenho: {
    npontos: 3,
    hints: ["Triângulo: clique no 1º vértice", "Triângulo: clique no 2º vértice", "Triângulo: clique no 3º vértice"],
  },
  fibo_extensao: {
    npontos: 3,
    hints: ["Fibonacci Extensão: clique no início do movimento", "Fibonacci Extensão: clique no fim do movimento", "Fibonacci Extensão: clique no ponto de retorno"],
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

// Pontinhas de seta das duas extremidades da linha contínua. É o que
// diferencia, de relance, a reta projetada do segmento entre dois cliques
// — sem elas as duas linhas ficam iguais e ninguém lembra qual é qual.
function _setaNaPonta(ctx, x, y, dx, dy){
  const n = Math.hypot(dx,dy);
  if(!n) return;
  const ux = dx/n, uy = dy/n, tam = 9, abre = 0.42;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - tam*(ux*Math.cos(abre) - uy*Math.sin(abre)), y - tam*(ux*Math.sin(abre) + uy*Math.cos(abre)));
  ctx.moveTo(x, y);
  ctx.lineTo(x - tam*(ux*Math.cos(-abre) - uy*Math.sin(-abre)), y - tam*(ux*Math.sin(-abre) + uy*Math.cos(-abre)));
  ctx.stroke();
}

/**
 * Linha de tendência.
 *
 * Por padrão vai EXATAMENTE de um clique ao outro: quem marcou um fundo e
 * um topo quer a reta entre os dois, não uma projeção que sobe até sumir
 * pela borda. Antes ela se estendia sempre até a direita do canvas, e era
 * isso que fazia a linha "fugir" do trecho marcado.
 *
 * `continua` (duplo clique no 2º ponto) devolve a projeção, agora pros
 * DOIS lados — é a reta de tendência que o trader quer prolongar. Desenho
 * antigo salvo sem o campo cai no padrão limitado.
 */
function _desenharTrend(ctx, toX, toY, pontos, isSel, canvasWidth, continua=false){
  if(pontos.length<2) return;
  const x1=toX(pontos[0].logical), y1=toY(pontos[0].preco);
  const x2=toX(pontos[1].logical), y2=toY(pontos[1].preco);
  if([x1,y1,x2,y2].some(v=>v==null)) return;

  ctx.save();
  ctx.strokeStyle = _cor();
  ctx.lineWidth = _lw(isSel);
  ctx.setLineDash(_dash());
  ctx.beginPath();
  if(continua){
    const [xL,yL,xR,yR] = x1<=x2 ? [x1,y1,x2,y2] : [x2,y2,x1,y1];
    const m = xR!==xL ? (yR-yL)/(xR-xL) : 0;
    const yIni = yL + m*(0-xL);
    const yFim = yR + m*(canvasWidth-xR);
    ctx.moveTo(0, yIni);
    ctx.lineTo(canvasWidth, yFim);
    ctx.stroke();
    ctx.lineWidth = _lw(isSel);
    _setaNaPonta(ctx, 0, yIni, -canvasWidth, yIni-yFim);
    _setaNaPonta(ctx, canvasWidth, yFim, canvasWidth, yFim-yIni);
  } else {
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
  }
  ctx.restore();
  _desenharHandle(ctx,x1,y1,_cor());
  _desenharHandle(ctx,x2,y2,_cor());
}

function _desenharHorizontal(ctx, toY, pontos, isSel, canvasWidth){
  if(pontos.length<1) return;
  const y = toY(pontos[0].preco);
  if(y==null) return;
  ctx.save();
  ctx.strokeStyle = _cor();
  ctx.lineWidth = _lw(isSel);
  ctx.setLineDash(_dash());
  ctx.beginPath();
  ctx.moveTo(0,y);
  ctx.lineTo(canvasWidth,y);
  ctx.stroke();
  ctx.font = "bold 10px 'JetBrains Mono',monospace";
  ctx.fillStyle = _cor();
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(fmtP(pontos[0].preco), canvasWidth-6, y-4);
  ctx.restore();
}

// Linha vertical: marca um candle (um evento, um dia). Só precisa do
// índice lógico — o preço do clique não importa.
function _desenharVertical(ctx, toX, pontos, isSel, canvasHeight){
  if(pontos.length<1) return;
  const x = toX(pontos[0].logical);
  if(x==null) return;
  ctx.save();
  ctx.strokeStyle = _cor();
  ctx.lineWidth = _lw(isSel);
  ctx.beginPath();
  ctx.moveTo(x,0);
  ctx.lineTo(x,canvasHeight);
  ctx.stroke();
  ctx.restore();
}

// Triângulo livre: três vértices ligados, com o miolo preenchido.
function _desenharTrianguloDesenho(ctx, toX, toY, pontos, isSel){
  const cantos = pontos.map(p=>({x:toX(p.logical), y:toY(p.preco)}));
  if(cantos.some(c=>c.x==null||c.y==null)) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cantos[0].x, cantos[0].y);
  for(const c of cantos.slice(1)) ctx.lineTo(c.x, c.y);
  if(cantos.length>2) ctx.closePath();
  if(cantos.length>2){ ctx.fillStyle = DESENHO_FILL; ctx.fill(); }
  ctx.strokeStyle = _cor();
  ctx.lineWidth = isSel?2.5:1.5;
  ctx.stroke();
  ctx.restore();
}

// Fibonacci de extensão: dois pontos marcam o movimento, o terceiro o
// retorno — e os níveis são projetados PRA FRENTE a partir dele (a
// retração, em _desenharFibonacci, divide o trecho entre dois pontos).
const NIVEIS_EXTENSAO = [0, 0.618, 1, 1.618, 2.618];
function _desenharFiboExtensao(ctx, toX, toY, pontos, isSel, canvasWidth){
  if(pontos.length<3) return;
  const [a,b,c] = pontos;
  const altura = b.preco - a.preco;
  const xBase = toX(c.logical);
  if(xBase==null) return;
  ctx.save();
  ctx.lineWidth = isSel?2:1.2;
  ctx.font = "bold 9px 'JetBrains Mono',monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  for(const nivel of NIVEIS_EXTENSAO){
    const preco = c.preco + altura*nivel;
    const y = toY(preco);
    if(y==null) continue;
    ctx.strokeStyle = _cor();
    ctx.globalAlpha = nivel===1 ? 0.9 : 0.55;
    ctx.beginPath();
    ctx.moveTo(xBase, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = _cor();
    ctx.fillText(`${(nivel*100).toFixed(1)}%  ${fmtP(preco)}`, xBase+4, y-3);
  }
  // o movimento que gerou a projeção, tracejado
  const xa=toX(a.logical), ya=toY(a.preco), xb=toX(b.logical), yb=toY(b.preco);
  if([xa,ya,xb,yb].every(v=>v!=null)){
    ctx.setLineDash([4,4]);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(xa,ya); ctx.lineTo(xb,yb); ctx.lineTo(xBase, toY(c.preco));
    ctx.stroke();
  }
  ctx.restore();
}

function _desenharRetanguloDesenho(ctx, toX, toY, pontos, isSel){
  if(pontos.length<2) return;
  const x1=toX(pontos[0].logical), y1=toY(pontos[0].preco);
  const x2=toX(pontos[1].logical), y2=toY(pontos[1].preco);
  if([x1,y1,x2,y2].some(v=>v==null)) return;
  const x=Math.min(x1,x2), y=Math.min(y1,y2), w=Math.abs(x2-x1), h=Math.abs(y2-y1);
  ctx.save();
  ctx.fillStyle = _corFill();
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle = _cor();
  ctx.lineWidth = _lw(isSel, 1.5);
  ctx.setLineDash(_dash());
  ctx.strokeRect(x,y,w,h);
  ctx.restore();
  _desenharHandle(ctx,x1,y1,_cor());
  _desenharHandle(ctx,x2,y2,_cor());
}

/**
 * Mantém a largura do canal quando a linha base é mexida.
 *
 * O 3º ponto é uma posição absoluta no gráfico, não uma distância. Sem
 * isto, arrastar o ponto A inclinava a base por baixo da paralela e o
 * canal apertava ou abria sozinho — no TradingView ele mantém a forma e
 * só gira.
 *
 * A conta é em PREÇO, não em pixel: assim a largura sobrevive ao zoom.
 * Devolve os pontos inalterados quando não há o que preservar.
 */
export function manterLarguraDoCanal(antes, depois, pontoIndex){
  if(pontoIndex > 1) return depois;                 // mexeram na própria largura
  if(!antes || antes.length < 3 || !depois || depois.length < 3) return depois;

  const precoNaBase = (pontos, logical) => {
    const [a, b] = pontos;
    if(b.logical === a.logical) return a.preco;
    return a.preco + (b.preco - a.preco) * (logical - a.logical) / (b.logical - a.logical);
  };

  const c = antes[2];
  const larguraEmPreco = c.preco - precoNaBase(antes, c.logical);
  const saida = depois.slice();
  saida[2] = { logical: c.logical, preco: precoNaBase(depois, c.logical) + larguraEmPreco };
  return saida;
}

/**
 * O ponteiro está no CORPO do desenho (não numa alça)?
 *
 * É o que separa "esticar uma ponta" de "mover a figura inteira": a alça
 * gira e estica, o corpo translada sem mexer na inclinação nem no
 * tamanho. Antes, só o retângulo e o texto tinham corpo — uma linha de
 * tendência só dava pra reposicionar apagando e redesenhando.
 *
 * Recebe os pontos JÁ EM PIXEL porque quem sabe converter preço e índice
 * lógico em tela é o componente do gráfico, não este módulo.
 */
export function _noCorpoDoDesenho(d, pts, mx, my, tol = 7){
  if(!d || !pts || !pts.length) return false;
  const emSegmento = (p, q) => _distPontoSegmento(mx, my, p.x, p.y, q.x, q.y) <= tol;

  // Risco vertical: corre a altura toda, então só o x importa.
  if(d.tipo === "vertical") return pts[0]?.x != null && Math.abs(mx - pts[0].x) <= tol;

  if(d.tipo === "retangulo_desenho"){
    if(pts.length < 2) return false;
    const [p0, p1] = pts;
    return mx >= Math.min(p0.x,p1.x)-tol && mx <= Math.max(p0.x,p1.x)+tol
        && my >= Math.min(p0.y,p1.y)-tol && my <= Math.max(p0.y,p1.y)+tol;
  }

  // Canal: a faixa inteira entre as duas paralelas, do mesmo jeito que
  // ela é pintada (ver _desenharCanal) — inclusive a mediana, que fica
  // dentro dela.
  if(d.tipo === "canal"){
    if(pts.length < 2) return false;
    const [a, b] = pts;
    if(pts.length < 3) return emSegmento(a, b);
    const [xL,yL,xR,yR] = a.x <= b.x ? [a.x,a.y,b.x,b.y] : [b.x,b.y,a.x,a.y];
    if(mx < xL-tol || mx > xR+tol) return false;
    const m = xR !== xL ? (yR-yL)/(xR-xL) : 0;
    const offset = pts[2].y - (yL + m*(pts[2].x - xL));
    const yBase = yL + m*(mx - xL);
    const [cima, baixo] = offset >= 0 ? [yBase, yBase+offset] : [yBase+offset, yBase];
    return my >= cima-tol && my <= baixo+tol;
  }

  // Fibonacci: as próprias linhas de nível, e não a caixa entre elas —
  // o espaço entre os níveis é onde ficam os candles que se está medindo,
  // e engolir o arrasto ali tiraria o pan do gráfico.
  if(d.tipo === "fibo"){
    if(pts.length < 2) return false;
    const [a, b] = pts;
    if(mx < Math.min(a.x,b.x)-tol || mx > Math.max(a.x,b.x)+tol) return false;
    const niveis = normalizarEstilo("fibo", d.estilo).niveis;
    return niveis.some(n => Math.abs(my - (a.y + (b.y-a.y)*n)) <= tol);
  }

  // Linha de tendência em modo contínuo: o corpo é a reta toda, não só o
  // trecho entre os dois cliques — é essa reta que a pessoa vê.
  if(d.tipo === "trend" && d.continua && pts.length >= 2){
    const [a, b] = pts;
    if(a.x === b.x) return Math.abs(mx - a.x) <= tol;
    const m = (b.y-a.y)/(b.x-a.x);
    // distância perpendicular = distância vertical × cosseno da inclinação
    return Math.abs(my - (a.y + m*(mx-a.x))) / Math.hypot(1, m) <= tol;
  }

  for(let i = 0; i < pts.length-1; i++) if(emSegmento(pts[i], pts[i+1])) return true;
  // O triângulo fecha: o lado que volta do último vértice ao primeiro
  // também é corpo.
  if(d.tipo === "triangulo_desenho" && pts.length === 3) return emSegmento(pts[2], pts[0]);
  return false;
}

function _desenharCanal(ctx, toX, toY, pontos, isSel, canvasWidth){
  if(pontos.length<2) return;
  const x1=toX(pontos[0].logical), y1=toY(pontos[0].preco);
  const x2=toX(pontos[1].logical), y2=toY(pontos[1].preco);
  if([x1,y1,x2,y2].some(v=>v==null)) return;
  const [xL,yL,xR,yR] = x1<=x2 ? [x1,y1,x2,y2] : [x2,y2,x1,y1];
  const m = xR!==xL ? (yR-yL)/(xR-xL) : 0;
  // O canal termina no 2º clique. Antes seguia até a borda direita do
  // canvas: quem marcava uma consolidação de duas semanas via as duas
  // linhas e a faixa sombreada atravessarem todo o resto do gráfico,
  // como se o canal valesse pra sempre. A inclinação `m` continua sendo
  // usada pra achar a paralela no 3º ponto.
  const xEnd = xR;
  const yBaseEnd = yR;

  // Só a linha base: é o preview depois do 1º clique, e o caso em que não
  // havia candle nenhum entre os dois pontos pra tirar a largura.
  if(pontos.length<3){
    ctx.save();
    ctx.strokeStyle = _cor();
    ctx.lineWidth = _lw(isSel);
    ctx.setLineDash(_dash());
    ctx.beginPath(); ctx.moveTo(xL,yL); ctx.lineTo(xEnd,yBaseEnd); ctx.stroke();
    ctx.restore();
    _desenharHandle(ctx,x1,y1,_cor());
    _desenharHandle(ctx,x2,y2,_cor());
    return;
  }

  const x3=toX(pontos[2].logical), y3=toY(pontos[2].preco);
  if([x3,y3].some(v=>v==null)) return;
  const yBaseAtX3 = yL + m*(x3-xL);
  const offset = y3 - yBaseAtX3;

  ctx.save();
  ctx.fillStyle = _corFill();
  ctx.beginPath();
  ctx.moveTo(xL,yL);
  ctx.lineTo(xEnd,yBaseEnd);
  ctx.lineTo(xEnd,yBaseEnd+offset);
  ctx.lineTo(xL,yL+offset);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = _cor();
  ctx.lineWidth = _lw(isSel);
  ctx.setLineDash(_dash());
  ctx.beginPath(); ctx.moveTo(xL,yL); ctx.lineTo(xEnd,yBaseEnd); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(xL,yL+offset); ctx.lineTo(xEnd,yBaseEnd+offset); ctx.stroke();

  // Mediana: o meio do canal, onde o preço costuma voltar quando o canal
  // está valendo. Pontilhada, fina e apagada de propósito — é referência,
  // não é uma das bordas.
  ctx.strokeStyle = _corFill(0.55);
  ctx.lineWidth = 1;
  ctx.setLineDash([4,4]);
  ctx.beginPath();
  ctx.moveTo(xL, yL+offset/2);
  ctx.lineTo(xEnd, yBaseEnd+offset/2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  _desenharHandle(ctx,x1,y1,_cor());
  _desenharHandle(ctx,x2,y2,_cor());
  // A 3ª âncora é a que ajusta a largura: fica na paralela, em cima do
  // ponto onde ela foi fixada.
  _desenharHandle(ctx,x3,y3,_cor());
}

/**
 * A caixa escura atrás do texto, em pixels.
 *
 * Exportada porque quem DESENHA e quem testa o clique precisam concordar
 * sobre onde ela está: a etiqueta inteira é arrastável, e não só o
 * pontinho de 8px da âncora — pegar aquele ponto era quase impossível, e
 * o texto parecia pregado no lugar.
 *
 * Mede com a fonte do próprio desenho: etiqueta em 32px tem caixa bem
 * maior que uma em 12px.
 */
export function _caixaDoTexto(ctx, x, y, texto, estilo){
  const e = normalizarEstilo("texto", estilo);
  ctx.save();
  ctx.font = fonteDoCanvas(e);
  const largura = ctx.measureText(texto || "").width;
  ctx.restore();
  const padX = 7, padY = 5;
  return { x: x-padX, y: y-e.tamanho/2-padY, w: largura+padX*2, h: e.tamanho+4+padY*2 };
}

/** O ponto está dentro da etiqueta? (com uma folga pro dedo no celular) */
export function _dentroDaCaixa(caixa, mx, my, folga=0){
  return mx >= caixa.x-folga && mx <= caixa.x+caixa.w+folga
      && my >= caixa.y-folga && my <= caixa.y+caixa.h+folga;
}

function _desenharTexto(ctx, toX, toY, pontos, texto, isSel){
  if(pontos.length<1 || !texto) return;
  const x=toX(pontos[0].logical), y=toY(pontos[0].preco);
  if(x==null || y==null) return;
  ctx.save();
  // Fonte, tamanho, negrito e itálico saem do estilo do desenho; a caixa
  // escura atrás se ajusta sozinha porque é medida com a MESMA conta do
  // teste de clique (_caixaDoTexto), pra não haver etiqueta que se vê num
  // lugar e se pega noutro.
  ctx.font = fonteDoCanvas(_estilo);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const { x:bx, y:by, w:bw, h:bh } = _caixaDoTexto(ctx, x, y, texto, _estilo);
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(bx,by,bw,bh,5); else ctx.rect(bx,by,bw,bh);
  ctx.fillStyle = "rgba(6,8,15,.78)";
  ctx.fill();
  if(isSel){ ctx.strokeStyle = _cor(); ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.fillStyle = _cor("#fff");
  ctx.fillText(texto, x, y);
  ctx.restore();
  _desenharHandle(ctx,x,y,_cor());
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
export function _desenharDesenhoUsuario(ctx, toLogX, toPrecoY, d, isSel, canvasWidth, preview=false, canvasHeight=0){
  // O estilo do desenho vale só durante esta pintura. Desenho antigo, sem
  // `estilo` nenhum, cai no padrão da ferramenta — é como ele já era.
  _estilo = FERRAMENTAS_PERSONALIZAVEIS.includes(d.tipo)
    ? normalizarEstilo(d.tipo, d.estilo)
    : null;
  if(preview){ ctx.save(); ctx.globalAlpha = 0.55; ctx.setLineDash([6,4]); }
  if(d.tipo==="trend")      _desenharTrend(ctx, toLogX, toPrecoY, d.pontos, isSel, canvasWidth, d.continua);
  else if(d.tipo==="vertical") _desenharVertical(ctx, toLogX, d.pontos, isSel, canvasHeight);
  else if(d.tipo==="triangulo_desenho") _desenharTrianguloDesenho(ctx, toLogX, toPrecoY, d.pontos, isSel);
  else if(d.tipo==="fibo_extensao") _desenharFiboExtensao(ctx, toLogX, toPrecoY, d.pontos, isSel, canvasWidth);
  else if(d.tipo==="horizontal") _desenharHorizontal(ctx, toPrecoY, d.pontos, isSel, canvasWidth);
  else if(d.tipo==="retangulo_desenho") _desenharRetanguloDesenho(ctx, toLogX, toPrecoY, d.pontos, isSel);
  else if(d.tipo==="canal")  _desenharCanal(ctx, toLogX, toPrecoY, d.pontos, isSel, canvasWidth);
  else if(d.tipo==="fibo")   _desenharFibonacci(ctx, toLogX, toPrecoY, d.pontos, isSel, canvasWidth);
  else if(d.tipo==="texto")  _desenharTexto(ctx, toLogX, toPrecoY, d.pontos, d.texto, isSel);
  else if(d.tipo==="regua")  _desenharRegua(ctx, toLogX, toPrecoY, d.pontos, isSel, canvasWidth);
  if(preview){ ctx.restore(); }
  _estilo = null;
}
