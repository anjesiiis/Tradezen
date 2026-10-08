// Ícone de cada padrão, pra reconhecer de relance o que já foi marcado
// num trecho do gráfico — serve pra não rotular a mesma coisa duas vezes.
//
// Vale nos dois lugares: no gráfico de marcação do admin e no gráfico do
// ativo no site. As chaves cobrem os dois jeitos de nomear que existem no
// projeto: o id da tabela (bandeira_alta) e o `tipo` que o backend devolve
// em /padroes-marcados (OCO, TOPO_DUPLO, SUPORTE...).
const ICONES = {
  // o que já existe no TradeZen
  oco: { icone: "🟠", rotulo: "OCO" },
  topo_duplo: { icone: "🔴", rotulo: "Topo Duplo" },
  niveis: { icone: "💡", rotulo: "Suporte/Resistência" },
  suporte: { icone: "💡", rotulo: "Suporte" },
  resistencia: { icone: "💡", rotulo: "Resistência" },
  bandeira_alta: { icone: "🚩", rotulo: "Bandeira de Alta" },
  bandeira_baixa: { icone: "🏴", rotulo: "Bandeira de Baixa" },
  flamula_alta: { icone: "🔼", rotulo: "Flâmula de Alta" },
  flamula_baixa: { icone: "🔽", rotulo: "Flâmula de Baixa" },
  cunha_alta: { icone: "🔶", rotulo: "Cunha de Alta" },
  cunha_baixa: { icone: "🔸", rotulo: "Cunha de Baixa" },
  canal_alta: { icone: "🟦", rotulo: "Canal de Alta" },
  canal_baixa: { icone: "🟪", rotulo: "Canal de Baixa" },

  // ainda não existem no projeto, mas já ficam prontos pra quando existirem
  fundo_duplo: { icone: "🟢", rotulo: "Fundo Duplo" },
  oco_invertido: { icone: "🟡", rotulo: "OCO Invertido" },
  topo_triplo: { icone: "🔺", rotulo: "Topo Triplo" },
  fundo_triplo: { icone: "🔻", rotulo: "Fundo Triplo" },
  triangulo: { icone: "🔷", rotulo: "Triângulo" },
};

export const ICONE_GENERICO = "⚡";

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

export function rotuloDoPadrao(tipo, reserva) {
  return ICONES[chaveDoPadrao(tipo)]?.rotulo || reserva || String(tipo || "Padrão");
}

/** Texto do tooltip: nome do padrão e quando foi detectado. */
export function descricaoDoPadrao(tipo, data, reserva) {
  const nome = rotuloDoPadrao(tipo, reserva);
  if (!data) return `${nome} — já marcado aqui`;
  const quando = new Date(data);
  if (Number.isNaN(quando.getTime())) return `${nome} — já marcado aqui`;
  // UTC: o candle é do dia inteiro; o fuso local jogaria a data um dia atrás
  return `${nome} — marcado em ${quando.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`;
}
