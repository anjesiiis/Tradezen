// ── PADRÕES DE REVERSÃO E DE CONSOLIDAÇÃO ─────────────────────
//
// Oito padrões que não cabem no formato "4 pares" da bandeira nem no
// "toques em duas linhas" do canal: cada um tem os seus pontos e as suas
// regras. Tudo deles vive aqui — pontos, desenho, área preenchida e
// validação —, e PainelMarcacao continua sendo a mesma tela pra todos
// (bandeira.js encaminha pra cá quando o padrão é um destes).
//
// Reversão (ziguezague + a linha de referência):
//   Fundo Duplo, OCO Invertido, Topo Triplo, Fundo Triplo
// Consolidação (duas bordas + a área entre elas):
//   Triângulo Ascendente/Descendente/Simétrico, Retângulo
//
// A área preenchida não é desenhada pelo gráfico (o TradingView desenha
// séries, não polígonos): sai num SVG por cima do canvas, com os pontos
// convertidos pra pixel — ver `areas` em TemplateMarkerChart.

import { AZUL, VERDE, VERMELHO } from "./canal.js";

const CINZA = "#8FA3C7";

// Tolerância de "mesmo nível": topos/fundos de um mesmo padrão nunca são
// idênticos no preço, e exigir isso tornaria o padrão impossível de
// marcar. 5% nos padrões de reversão, 3% nas bordas horizontais do
// triângulo e do retângulo, que são mais exigentes por definição.
export const TOLERANCIA_REVERSAO = 0.05;
export const TOLERANCIA_BORDA = 0.03;

function parecidos(a, b, tolerancia) {
  const base = Math.max(Math.abs(a), Math.abs(b));
  return base === 0 ? true : Math.abs(a - b) / base <= tolerancia;
}

const pct = (t) => `${Math.round(t * 100)}%`;

// ── Os oito padrões ───────────────────────────────────────────
// `passos`: [chave, rótulo, cor] — a ordem é a ordem de marcação.
// `linhas`: pares de chaves ligadas, no desenho.
// `nivel`: linha horizontal tracejada calculada (média dos pontos).
// `area`:  polígono preenchido, na ordem em que fecha.
// `inversao`: única coisa que BLOQUEIA — topo e fundo trocados de lugar,
//              que é marcação impossível de ler e de treinar.
// `conferir`:  o que vira AVISO amarelo e salva mesmo assim (níveis que
//              não batem, ordem no tempo, bordas pouco horizontais). São
//              julgamentos do analista, não erros: quem marca é quem sabe.
const ESPEC = {
  fundo_duplo: {
    rotulo: "Fundo Duplo", nav: "fundo-duplo", alta: true, sigla: "FDU",
    passos: [
      ["vale1", "Vale 1", VERDE],
      ["pico", "Pico", CINZA],
      ["vale2", "Vale 2", VERDE],
      ["confirmacao", "Confirmação", AZUL],
    ],
    linhas: [["vale1", "pico"], ["pico", "vale2"], ["vale2", "confirmacao"]],
    nivel: { chaves: ["pico"], rotulo: "Linha de pescoço" },
    inversao: (p) => (p.pico.preco <= p.vale1.preco || p.pico.preco <= p.vale2.preco)
      ? 'O "Pico" está abaixo dos vales — topo e fundo trocados de lugar.' : null,
    conferir: (p) => {
      // a ordem no tempo já sai do laço das linhas, em avisosExtras
      const avisos = [];
      if (!parecidos(p.vale1.preco, p.vale2.preco, TOLERANCIA_REVERSAO)) {
        avisos.push(`Confira: os dois vales estão a mais de ${pct(TOLERANCIA_REVERSAO)} um do outro.`);
      }
      return avisos;
    },
  },

  oco_invertido: {
    rotulo: "OCO Invertido", nav: "oco-invertido", alta: true, sigla: "OCI",
    passos: [
      ["ombro_esq", "Ombro Esquerdo", VERDE],
      ["cabeca", "Cabeça", VERMELHO],
      ["ombro_dir", "Ombro Direito", VERDE],
      ["pescoco", "Linha de Pescoço", AZUL],
    ],
    linhas: [["ombro_esq", "cabeca"], ["cabeca", "ombro_dir"]],
    nivel: { chaves: ["pescoco"], rotulo: "Linha de pescoço" },
    inversao: (p) => {
      if (p.cabeca.preco >= p.ombro_esq.preco || p.cabeca.preco >= p.ombro_dir.preco) {
        return 'A "Cabeça" está acima dos ombros — num OCO invertido ela é o fundo mais baixo.';
      }
      if (p.pescoco.preco <= Math.max(p.ombro_esq.preco, p.cabeca.preco, p.ombro_dir.preco)) {
        return 'A "Linha de Pescoço" está abaixo dos fundos — ela fica por cima do padrão.';
      }
      return null;
    },
    conferir: (p) => (parecidos(p.ombro_esq.preco, p.ombro_dir.preco, TOLERANCIA_REVERSAO)
      ? []
      : [`Confira: os dois ombros estão a mais de ${pct(TOLERANCIA_REVERSAO)} um do outro.`]),
  },

  topo_triplo: {
    rotulo: "Topo Triplo", nav: "topo-triplo", alta: false, sigla: "TTR",
    passos: [
      ["topo1", "Topo 1", VERMELHO],
      ["vale1", "Vale 1", CINZA],
      ["topo2", "Topo 2", VERMELHO],
      ["vale2", "Vale 2", CINZA],
      ["topo3", "Topo 3", VERMELHO],
    ],
    linhas: [["topo1", "vale1"], ["vale1", "topo2"], ["topo2", "vale2"], ["vale2", "topo3"]],
    nivel: { chaves: ["topo1", "topo2", "topo3"], rotulo: "Resistência" },
    inversao: (p) => {
      const topos = [p.topo1.preco, p.topo2.preco, p.topo3.preco];
      const vales = [p.vale1.preco, p.vale2.preco];
      return Math.max(...vales) >= Math.min(...topos)
        ? "Tem vale acima de topo — os pontos estão trocados." : null;
    },
    conferir: (p) => {
      const avisos = [];
      const topos = [p.topo1.preco, p.topo2.preco, p.topo3.preco];
      if (!parecidos(Math.min(...topos), Math.max(...topos), TOLERANCIA_REVERSAO)) {
        avisos.push(`Confira: os três topos estão a mais de ${pct(TOLERANCIA_REVERSAO)} entre si.`);
      }
      if (!(p.topo1.i < p.vale1.i && p.vale1.i < p.topo2.i)) avisos.push('Confira: "Vale 1" não está entre "Topo 1" e "Topo 2".');
      if (!(p.topo2.i < p.vale2.i && p.vale2.i < p.topo3.i)) avisos.push('Confira: "Vale 2" não está entre "Topo 2" e "Topo 3".');
      return avisos;
    },
  },

  fundo_triplo: {
    rotulo: "Fundo Triplo", nav: "fundo-triplo", alta: true, sigla: "FTR",
    passos: [
      ["fundo1", "Fundo 1", VERDE],
      ["pico1", "Pico 1", CINZA],
      ["fundo2", "Fundo 2", VERDE],
      ["pico2", "Pico 2", CINZA],
      ["fundo3", "Fundo 3", VERDE],
    ],
    linhas: [["fundo1", "pico1"], ["pico1", "fundo2"], ["fundo2", "pico2"], ["pico2", "fundo3"]],
    nivel: { chaves: ["fundo1", "fundo2", "fundo3"], rotulo: "Suporte" },
    inversao: (p) => {
      const fundos = [p.fundo1.preco, p.fundo2.preco, p.fundo3.preco];
      const picos = [p.pico1.preco, p.pico2.preco];
      return Math.min(...picos) <= Math.max(...fundos)
        ? "Tem pico abaixo de fundo — os pontos estão trocados." : null;
    },
    conferir: (p) => {
      const avisos = [];
      const fundos = [p.fundo1.preco, p.fundo2.preco, p.fundo3.preco];
      if (!parecidos(Math.min(...fundos), Math.max(...fundos), TOLERANCIA_REVERSAO)) {
        avisos.push(`Confira: os três fundos estão a mais de ${pct(TOLERANCIA_REVERSAO)} entre si.`);
      }
      if (!(p.fundo1.i < p.pico1.i && p.pico1.i < p.fundo2.i)) avisos.push('Confira: "Pico 1" não está entre "Fundo 1" e "Fundo 2".');
      if (!(p.fundo2.i < p.pico2.i && p.pico2.i < p.fundo3.i)) avisos.push('Confira: "Pico 2" não está entre "Fundo 2" e "Fundo 3".');
      return avisos;
    },
  },

  triangulo_ascendente: {
    rotulo: "Triângulo Ascendente", nav: "triangulo-ascendente", alta: true, sigla: "TAS",
    passos: [
      ["res_esq", "Resistência Esquerda", VERMELHO],
      ["res_dir", "Resistência Direita", VERMELHO],
      ["sup_esq", "Suporte Esquerdo", VERDE],
      ["sup_dir", "Suporte Direito", VERDE],
    ],
    linhas: [["res_esq", "res_dir"], ["sup_esq", "sup_dir"]],
    area: { chaves: ["res_esq", "res_dir", "sup_dir", "sup_esq"], cor: AZUL, opacidade: 0.15 },
    inversao: (p) => (Math.max(p.sup_esq.preco, p.sup_dir.preco) >= Math.min(p.res_esq.preco, p.res_dir.preco)
      ? "O suporte está acima da resistência — as duas bordas estão trocadas." : null),
    conferir: (p) => {
      const avisos = [];
      if (!parecidos(p.res_esq.preco, p.res_dir.preco, TOLERANCIA_BORDA)) {
        avisos.push(`Confira: a resistência não está horizontal (mais de ${pct(TOLERANCIA_BORDA)} entre as pontas).`);
      }
      if (p.sup_dir.preco <= p.sup_esq.preco) {
        avisos.push('Confira: o suporte não está subindo — num triângulo ascendente ele sobe.');
      }
      return avisos;
    },
  },

  triangulo_descendente: {
    rotulo: "Triângulo Descendente", nav: "triangulo-descendente", alta: false, sigla: "TDE",
    passos: [
      ["res_esq", "Resistência Esquerda", VERMELHO],
      ["res_dir", "Resistência Direita", VERMELHO],
      ["sup_esq", "Suporte Esquerdo", VERDE],
      ["sup_dir", "Suporte Direito", VERDE],
    ],
    linhas: [["res_esq", "res_dir"], ["sup_esq", "sup_dir"]],
    area: { chaves: ["res_esq", "res_dir", "sup_dir", "sup_esq"], cor: AZUL, opacidade: 0.15 },
    inversao: (p) => (Math.max(p.sup_esq.preco, p.sup_dir.preco) >= Math.min(p.res_esq.preco, p.res_dir.preco)
      ? "O suporte está acima da resistência — as duas bordas estão trocadas." : null),
    conferir: (p) => {
      const avisos = [];
      if (!parecidos(p.sup_esq.preco, p.sup_dir.preco, TOLERANCIA_BORDA)) {
        avisos.push(`Confira: o suporte não está horizontal (mais de ${pct(TOLERANCIA_BORDA)} entre as pontas).`);
      }
      if (p.res_dir.preco >= p.res_esq.preco) {
        avisos.push('Confira: a resistência não está cedendo — num triângulo descendente ela cai.');
      }
      return avisos;
    },
  },

  triangulo_simetrico: {
    rotulo: "Triângulo Simétrico", nav: "triangulo-simetrico", alta: null, sigla: "TSI",
    passos: [
      ["topo_esq", "Topo Esquerdo", VERMELHO],
      ["topo_dir", "Topo Direito", VERMELHO],
      ["fundo_esq", "Fundo Esquerdo", VERDE],
      ["fundo_dir", "Fundo Direito", VERDE],
    ],
    linhas: [["topo_esq", "topo_dir"], ["fundo_esq", "fundo_dir"]],
    area: { chaves: ["topo_esq", "topo_dir", "fundo_dir", "fundo_esq"], cor: AZUL, opacidade: 0.15 },
    inversao: (p) => (Math.max(p.fundo_esq.preco, p.fundo_dir.preco) >= Math.min(p.topo_esq.preco, p.topo_dir.preco)
      ? "O fundo está acima do topo — as duas bordas estão trocadas." : null),
    conferir: (p) => {
      const avisos = [];
      if (p.topo_dir.preco >= p.topo_esq.preco) avisos.push('Confira: os topos não estão caindo — num triângulo simétrico as bordas convergem.');
      if (p.fundo_dir.preco <= p.fundo_esq.preco) avisos.push('Confira: os fundos não estão subindo — num triângulo simétrico as bordas convergem.');
      return avisos;
    },
  },

  retangulo: {
    rotulo: "Retângulo", nav: "retangulo", alta: null, sigla: "RET",
    passos: [
      ["res_esq", "Resistência Esquerda", VERMELHO],
      ["res_dir", "Resistência Direita", VERMELHO],
      ["sup_esq", "Suporte Esquerdo", VERDE],
      ["sup_dir", "Suporte Direito", VERDE],
    ],
    linhas: [["res_esq", "res_dir"], ["sup_esq", "sup_dir"]],
    // As laterais do retângulo são verticais, e uma série do gráfico só
    // tem um preço por candle: quem as desenha é a borda do polígono.
    area: { chaves: ["res_esq", "res_dir", "sup_dir", "sup_esq"], cor: CINZA, opacidade: 0.12, borda: true },
    inversao: (p) => (Math.max(p.sup_esq.preco, p.sup_dir.preco) >= Math.min(p.res_esq.preco, p.res_dir.preco)
      ? "O suporte está acima da resistência — as duas bordas estão trocadas." : null),
    conferir: (p) => {
      const avisos = [];
      if (!parecidos(p.res_esq.preco, p.res_dir.preco, TOLERANCIA_BORDA)) {
        avisos.push(`Confira: as resistências estão a mais de ${pct(TOLERANCIA_BORDA)} uma da outra.`);
      }
      if (!parecidos(p.sup_esq.preco, p.sup_dir.preco, TOLERANCIA_BORDA)) {
        avisos.push(`Confira: os suportes estão a mais de ${pct(TOLERANCIA_BORDA)} um do outro.`);
      }
      return avisos;
    },
  },
};

// Os padrões no formato que PainelMarcacao e lampadas.js esperam
export const PADROES_EXTRAS = Object.fromEntries(
  Object.entries(ESPEC).map(([id, e]) => [id, {
    id, rotulo: e.rotulo, nav: e.nav, alta: e.alta, forma: "extra",
    rota: `/admin/templates/${e.nav}`,
  }])
);

export function ehExtra(padrao) {
  return Boolean(ESPEC[padrao?.id]);
}

export function espec(padrao) {
  return ESPEC[padrao?.id] || null;
}

export function siglaExtra(id) {
  return ESPEC[id]?.sigla || "???";
}

export function stepsExtras(padrao) {
  return espec(padrao).passos.map(([key, label, color], i) => ({
    key, label, color, short: `P${i + 1}`,
  }));
}

export function passosExtras(padrao) {
  return espec(padrao).passos.map(([key]) => key);
}

export function temFormatoExtra(pontos, padrao) {
  return Boolean(pontos) && passosExtras(padrao).every((k) => pontos[k]);
}

/** O emoji do padrão fica ancorado no ponto mais característico dele. */
export function ancoraExtra(padrao) {
  const chaves = passosExtras(padrao);
  const preferida = { oco_invertido: "cabeca", topo_triplo: "topo2", fundo_triplo: "fundo2", fundo_duplo: "pico" };
  return preferida[padrao.id] || chaves[0];
}

/** Linhas do desenho: as bordas do padrão e o nível calculado. */
export function linhasExtras(pontos, padrao) {
  if (!pontos) return [];
  const e = espec(padrao);
  const linhas = e.linhas
    .filter(([a, b]) => pontos[a] && pontos[b])
    .map(([a, b]) => ({
      id: `${a}-${b}`, cor: AZUL, largura: 2, tracejada: false,
      dados: [{ i: pontos[a].i, preco: pontos[a].preco }, { i: pontos[b].i, preco: pontos[b].preco }],
    }));

  // Nível de referência (pescoço / resistência / suporte): média dos
  // pontos que o definem, atravessando o padrão de ponta a ponta.
  if (e.nivel) {
    const usados = e.nivel.chaves.map((k) => pontos[k]).filter(Boolean);
    const marcados = Object.values(pontos);
    // a partir de 3 pontos: com 2 a "linha de referência" ainda não
    // significa nada, e só polui a tela de quem está marcando
    if (usados.length === e.nivel.chaves.length && marcados.length >= 3) {
      const preco = usados.reduce((s, p) => s + p.preco, 0) / usados.length;
      const indices = marcados.map((p) => p.i);
      linhas.push({
        id: "nivel", cor: CINZA, largura: 1.5, tracejada: true,
        dados: [{ i: Math.min(...indices), preco }, { i: Math.max(...indices), preco }],
      });
    }
  }
  return linhas;
}

/** Polígono preenchido (triângulos e retângulo), ou [] pros outros. */
export function areasExtras(pontos, padrao) {
  const e = espec(padrao);
  if (!e?.area || !pontos) return [];
  const cantos = e.area.chaves.map((k) => pontos[k]);
  if (cantos.some((p) => !p)) return [];
  return [{
    id: `area-${padrao.id}`,
    cor: e.area.cor,
    opacidade: e.area.opacidade,
    borda: Boolean(e.area.borda),
    pontos: cantos.map((p) => ({ i: p.i, preco: p.preco })),
  }];
}

/**
 * O que IMPEDE de salvar. De propósito é quase nada: falta de ponto e
 * topo/fundo trocados.
 *
 * Antes isto barrava nível fora de ±5%, ordem no tempo, borda pouco
 * horizontal... e o analista ficava preso numa marcação que ele sabia
 * estar certa. Essas conferências agora são avisos amarelos: aparecem,
 * o template salva do jeito que foi marcado, e quem decide é quem está
 * olhando o gráfico.
 */
export function validarExtra(pontos, padrao) {
  if (!temFormatoExtra(pontos, padrao)) {
    return [`Marque os ${passosExtras(padrao).length} pontos antes de salvar.`];
  }
  const invertido = espec(padrao).inversao(pontos);
  return invertido ? [invertido] : [];
}

export function avisosExtras(pontos, padrao) {
  if (!temFormatoExtra(pontos, padrao)) return [];
  const e = espec(padrao);
  const nome = (k) => e.passos.find(([chave]) => chave === k)[1];
  const avisos = [...e.conferir(pontos)];

  // A ordem é conferida DENTRO de cada linha do desenho, não na ordem de
  // marcação. Num triângulo as duas bordas se alternam no tempo (o
  // suporte esquerdo costuma vir antes da resistência direita) — comparar
  // passo a passo acusava erro numa marcação perfeitamente normal.
  for (const [a, b] of e.linhas) {
    if (pontos[b].i < pontos[a].i) {
      avisos.push(`Confira a ordem: "${nome(b)}" está antes de "${nome(a)}" no gráfico.`);
    }
  }
  return avisos;
}
