// Ícone de cada padrão, pra reconhecer de relance o que já foi marcado
// num trecho do gráfico — serve pra não rotular a mesma coisa duas vezes.
//
// O ícone é a FORMA do padrão (Ⓜ️ topo duplo, 🇼 fundo duplo, ⛰️ OCO,
// 🏳️ bandeira, 🚩 flâmula/cunha, ↗️ canal). A direção vem da cor, aplicada
// por fora do emoji — `cor: "alta"` acende verde, `"baixa"` vermelho,
// `"neutro"` amarelo. Emoji não aceita cor por CSS (é glifo da fonte), por
// isso a cor vira um brilho em volta: no DOM pelas classes abaixo, no
// gráfico do site pelo `shadowColor` do canvas.
//
// 🚩 serve flâmula E cunha, porque é o que o desenho das duas parece. Quem
// separa é a cor (direção) e a borda pontilhada da cunha, que pode romper
// pros dois lados — e o tooltip, que diz o nome por extenso.
//
// Vale nos dois lugares: no gráfico de marcação do admin e no gráfico do
// ativo no site. As chaves cobrem os dois jeitos de nomear que existem no
// projeto: o id da tabela (bandeira_alta) e o `tipo` que o backend devolve
// em /padroes-marcados (OCO, TOPO_DUPLO, suporte...).
const ICONES = {
  // ── o que já existe no TradeZen ──
  topo_duplo: { icone: "Ⓜ️", cor: "baixa", rotulo: "Topo Duplo", acima: true },
  bandeira_alta: { icone: "🏳️", cor: "alta", rotulo: "Bandeira de Alta", acima: false },
  bandeira_baixa: { icone: "🏳️", cor: "baixa", rotulo: "Bandeira de Baixa", acima: true },
  flamula_alta: { icone: "🚩", cor: "alta", rotulo: "Flâmula de Alta", acima: false },
  flamula_baixa: { icone: "🚩", cor: "baixa", rotulo: "Flâmula de Baixa", acima: true },
  cunha_alta: { icone: "🚩", cor: "alta", cunha: true, rotulo: "Cunha de Alta", acima: false },
  cunha_baixa: { icone: "🚩", cor: "baixa", cunha: true, rotulo: "Cunha de Baixa", acima: true },
  canal_alta: { icone: "↗️", cor: "alta", rotulo: "Canal de Alta", acima: false },
  canal_baixa: { icone: "↙️", cor: "baixa", rotulo: "Canal de Baixa", acima: true },
  oco: { icone: "⛰️", cor: "baixa", rotulo: "OCO", acima: true },
  niveis: { icone: "🟢", cor: "neutro", rotulo: "Suporte/Resistência", acima: true },
  suporte: { icone: "🟢", cor: "alta", rotulo: "Suporte", acima: false },
  resistencia: { icone: "🔴", cor: "baixa", rotulo: "Resistência", acima: true },

  // ── ainda não existem no projeto; já ficam prontos ──
  fundo_duplo: { icone: "🇼", cor: "alta", rotulo: "Fundo Duplo", acima: false },
  // mesmo ⛰️ do OCO, de cabeça pra baixo (é o mesmo desenho espelhado)
  oco_invertido: { icone: "⛰️", cor: "alta", invertido: true, rotulo: "OCO Invertido", acima: false },
  topo_triplo: { icone: "🔺🔺🔺", cor: "baixa", rotulo: "Topo Triplo", acima: true },
  fundo_triplo: { icone: "🔻🔻🔻", cor: "alta", rotulo: "Fundo Triplo", acima: false },
  triangulo_ascendente: { icone: "🔺", cor: "alta", rotulo: "Triângulo Ascendente", acima: true },
  triangulo_descendente: { icone: "🔺", cor: "baixa", rotulo: "Triângulo Descendente", acima: true },
  triangulo_simetrico: { icone: "🔺", cor: "neutro", rotulo: "Triângulo Simétrico", acima: true },
  triangulo: { icone: "🔺", cor: "neutro", rotulo: "Triângulo", acima: true },
  retangulo: { icone: "⬜", cor: "neutro", rotulo: "Retângulo", acima: true },
  xicara_com_alca: { icone: "☕", cor: "alta", rotulo: "Xícara com Alça", acima: false },
  diamante: { icone: "💠", cor: "neutro", rotulo: "Diamante", acima: true },
  gap_de_alta: { icone: "⤴️", cor: "alta", rotulo: "Gap de Alta", acima: false },
  gap_de_baixa: { icone: "⤵️", cor: "baixa", rotulo: "Gap de Baixa", acima: true },
};

export const ICONE_GENERICO = "⚡";

// Mesmas cores do design system (--verde, --vermelho) — o amarelo é o do
// "pode romper pros dois lados".
export const COR_DA_DIRECAO = {
  alta: "#26a69a",
  baixa: "#ef5350",
  neutro: "#f0b90b",
};

/** Normaliza o jeito como cada parte do sistema nomeia o padrão. */
export function chaveDoPadrao(tipo = "") {
  return String(tipo)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // tira acento
    .replace(/[\s-]+/g, "_");
}

export function iconeDoPadrao(tipo) {
  return ICONES[chaveDoPadrao(tipo)]?.icone || ICONE_GENERICO;
}

/** Em cima do candle (padrão de baixa/neutro) ou embaixo (de alta). */
export function ficaAcima(tipo) {
  return ICONES[chaveDoPadrao(tipo)]?.acima ?? true;
}

/** "alta" | "baixa" | "neutro" — a direção que o brilho do ícone mostra. */
export function direcaoDoPadrao(tipo) {
  return ICONES[chaveDoPadrao(tipo)]?.cor || "neutro";
}

export function corDoPadrao(tipo) {
  return COR_DA_DIRECAO[direcaoDoPadrao(tipo)];
}

/** Classes do ícone no DOM: cor da direção, cunha e espelhamento. */
export function classeDoPadrao(tipo) {
  const p = ICONES[chaveDoPadrao(tipo)];
  if (!p) return "cor-neutro";
  return [`cor-${p.cor}`, p.cunha && "cunha", p.invertido && "invertido"]
    .filter(Boolean)
    .join(" ");
}

/** Desenhado de cabeça pra baixo (OCO Invertido). */
export function ehInvertido(tipo) {
  return Boolean(ICONES[chaveDoPadrao(tipo)]?.invertido);
}

export function rotuloDoPadrao(tipo, reserva) {
  return ICONES[chaveDoPadrao(tipo)]?.rotulo || reserva || String(tipo || "Padrão");
}

/** Texto do tooltip: nome do padrão e quando foi detectado. */
export function descricaoDoPadrao(tipo, data, reserva, resultado) {
  const nome = rotuloDoPadrao(tipo, reserva);
  const fim = resultado ? ` • ${resultado}` : "";
  const quando = data ? new Date(data) : null;
  if (!quando || Number.isNaN(quando.getTime())) return `${nome} — já marcado aqui${fim}`;
  // UTC: o candle é do dia inteiro; o fuso local jogaria a data um dia atrás
  const dia = quando.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  return `${nome} • ${dia}${fim}`;
}
