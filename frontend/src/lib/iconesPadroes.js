// Ícone de cada padrão, pra reconhecer de relance o que já foi marcado
// num trecho do gráfico — serve pra não rotular a mesma coisa duas vezes.
//
// A cor segue a DIREÇÃO do padrão, não o padrão em si: 🟢 alta, 🔴 baixa,
// 🔵 neutro/indefinido, 🟡 cunha (que pode romper pros dois lados). Quem
// diz qual é o padrão é o tooltip. 💡 fica com suporte/resistência, que é
// nível e não padrão de preço.
//
// Vale nos dois lugares: no gráfico de marcação do admin e no gráfico do
// ativo no site. As chaves cobrem os dois jeitos de nomear que existem no
// projeto: o id da tabela (bandeira_alta) e o `tipo` que o backend devolve
// em /padroes-marcados (OCO, TOPO_DUPLO, suporte...).
const ICONES = {
  // ── o que já existe no TradeZen ──
  bandeira_alta: { icone: "🟢", rotulo: "Bandeira de Alta", acima: false },
  bandeira_baixa: { icone: "🔴", rotulo: "Bandeira de Baixa", acima: true },
  topo_duplo: { icone: "🔴", rotulo: "Topo Duplo", acima: true },
  oco: { icone: "🔴", rotulo: "OCO", acima: true },
  cunha_alta: { icone: "🟡", rotulo: "Cunha de Alta", acima: true },
  cunha_baixa: { icone: "🟡", rotulo: "Cunha de Baixa", acima: true },
  canal_alta: { icone: "🟢", rotulo: "Canal de Alta", acima: false },
  canal_baixa: { icone: "🔴", rotulo: "Canal de Baixa", acima: true },
  flamula_alta: { icone: "🔵", rotulo: "Flâmula de Alta", acima: true },
  flamula_baixa: { icone: "🔵", rotulo: "Flâmula de Baixa", acima: true },
  niveis: { icone: "💡", rotulo: "Suporte/Resistência", acima: true },
  suporte: { icone: "💡", rotulo: "Suporte", acima: false },
  resistencia: { icone: "💡", rotulo: "Resistência", acima: true },

  // ── ainda não existem no projeto; já ficam prontos ──
  fundo_duplo: { icone: "🟢", rotulo: "Fundo Duplo", acima: false },
  oco_invertido: { icone: "🟢", rotulo: "OCO Invertido", acima: false },
  topo_triplo: { icone: "🔴", rotulo: "Topo Triplo", acima: true },
  fundo_triplo: { icone: "🟢", rotulo: "Fundo Triplo", acima: false },
  triangulo_ascendente: { icone: "🔵", rotulo: "Triângulo Ascendente", acima: true },
  triangulo_descendente: { icone: "🔵", rotulo: "Triângulo Descendente", acima: true },
  triangulo_simetrico: { icone: "🔵", rotulo: "Triângulo Simétrico", acima: true },
  triangulo: { icone: "🔵", rotulo: "Triângulo", acima: true },
  retangulo: { icone: "⬜", rotulo: "Retângulo", acima: true },
  xicara_com_alca: { icone: "🟢", rotulo: "Xícara com Alça", acima: false },
  diamante: { icone: "🟣", rotulo: "Diamante", acima: true },
  gap_de_alta: { icone: "🟢", rotulo: "Gap de Alta", acima: false },
  gap_de_baixa: { icone: "🔴", rotulo: "Gap de Baixa", acima: true },
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

/** Em cima do candle (padrão de baixa/neutro) ou embaixo (de alta). */
export function ficaAcima(tipo) {
  return ICONES[chaveDoPadrao(tipo)]?.acima ?? true;
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
