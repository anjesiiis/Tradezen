/**
 * TRADEZEN — EM QUE PÉ ESTÁ CADA MARCAÇÃO
 * =======================================
 *
 * Os cinco status, e a diferença entre eles é o ponto da feature:
 *
 *   nao_visto    → ninguém abriu
 *   aberto       → ABRIU, e só. Entra sozinho e de propósito NÃO quer
 *                  dizer "está certa": três segundos de tela aberta não
 *                  são um julgamento. Serve pra enxergar por onde já se
 *                  passou sem afirmar que se aprovou.
 *   visto        → olhou e está OK. Clique.
 *   em_andamento → volta depois. Clique.
 *   revisto      → reclassificou ou confirmou. Clique, ou automático
 *                  quando a marcação troca de lado.
 *
 * Os três de clique são MUTUAMENTE EXCLUSIVOS — uma marcação está num pé
 * só. Por isso a tela desenha um grupo de rádio e não três caixinhas:
 * caixinha que desmarca as outras ao ser marcada mente sobre o que é, e
 * quem usa teclado ou leitor de tela recebe a mentira primeiro.
 */

export const STATUS_PADRAO = "nao_visto";

// Os que o admin escolhe, na ordem em que aparecem.
export const STATUS_DE_CLIQUE = [
  { id: "visto", rotulo: "Visto", marca: "👁", dica: "Olhei e está OK, não precisa mexer" },
  { id: "em_andamento", rotulo: "Em andamento", marca: "⏳", dica: "Ainda analisando, quero voltar" },
  { id: "revisto", rotulo: "Revisto", marca: "✅", dica: "Reclassifiquei ou confirmei com certeza" },
];

// Como cada um aparece como selo na lista. `aberto` é de propósito o mais
// apagado: ele não afirma nada sobre a marcação.
export const SELO = {
  aberto: { rotulo: "Aberto", marca: "·", classe: "sr-aberto" },
  visto: { rotulo: "Visto", marca: "👁", classe: "sr-visto" },
  em_andamento: { rotulo: "Em andamento", marca: "⏳", classe: "sr-andamento" },
  revisto: { rotulo: "Revisto", marca: "✅", classe: "sr-revisto" },
};

// Os filtros do topo, na ordem de quem está revisando: primeiro o que
// falta. "Aberto" entra junto de "não vistos" em `pendentes` porque abrir
// não resolveu nada — é exatamente o que ficou pendente.
export const FILTROS = [
  { id: "todos", rotulo: "Todos", cabe: () => true },
  { id: "pendentes", rotulo: "Falta decidir", cabe: (s) => s === "nao_visto" || s === "aberto" },
  { id: "em_andamento", rotulo: "Em andamento", cabe: (s) => s === "em_andamento" },
  { id: "visto", rotulo: "Vistos", cabe: (s) => s === "visto" },
  { id: "revisto", rotulo: "Revistos", cabe: (s) => s === "revisto" },
];

/**
 * Os status que ganham faixa colorida na borda do card.
 *
 * `aberto` e `nao_visto` ficam de fora: faixa é sinal de DECISÃO tomada,
 * e abrir não é decisão. Fora daqui, a classe nem é escrita no card —
 * classe sem CSS no DOM é lixo que o próximo a ler vai investigar.
 */
export const COM_FAIXA = new Set(["visto", "em_andamento", "revisto"]);

/** O status de um id, vindo do mapa do backend. */
export function statusDe(mapa, id) {
  return mapa?.[String(id)]?.status || STATUS_PADRAO;
}

/**
 * Clicar no status que já está aceso desmarca.
 *
 * Volta pra `aberto` e não pra `nao_visto`: a marcação FOI aberta, e
 * dizer que não foi seria apagar um fato. Quem quer mesmo zerar usa o
 * filtro — não há por que fingir que nunca se olhou.
 */
export function proximoStatus(atual, clicado) {
  return atual === clicado ? "aberto" : clicado;
}

/** Quantas marcações em cada filtro, pra escrever o número no botão. */
export function contarPorFiltro(templates, mapa) {
  const contas = {};
  for (const f of FILTROS) contas[f.id] = 0;
  for (const t of templates || []) {
    const s = statusDe(mapa, t?.id);
    for (const f of FILTROS) if (f.cabe(s)) contas[f.id] += 1;
  }
  return contas;
}

export function filtrar(templates, mapa, filtroId) {
  const filtro = FILTROS.find((f) => f.id === filtroId);
  if (!filtro || filtro.id === "todos") return templates || [];
  return (templates || []).filter((t) => filtro.cabe(statusDe(mapa, t?.id)));
}
