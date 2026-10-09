// Lista do filtro de padrões do gráfico de marcação.
//
// Fica fora do componente porque todas as telas de marcação leem daqui e
// porque o estado inicial é lido antes de qualquer render.

// Todos têm tabela e tela de marcação própria — a marca "em breve" saiu
// quando os oito últimos (fundo duplo, OCO invertido, topos/fundos
// triplos, triângulos e retângulo) ganharam tela. A ordem é a mesma das
// duas linhas da navegação: reversão, continuação, consolidação.
export const PADROES_DO_FILTRO = [
  // reversão
  { id: "topo_duplo", nome: "Topo Duplo" },
  { id: "fundo_duplo", nome: "Fundo Duplo" },
  { id: "topo_triplo", nome: "Topo Triplo" },
  { id: "fundo_triplo", nome: "Fundo Triplo" },
  { id: "oco", nome: "OCO" },
  { id: "oco_invertido", nome: "OCO Invertido" },
  // continuação
  { id: "bandeira_alta", nome: "Bandeira de Alta" },
  { id: "bandeira_baixa", nome: "Bandeira de Baixa" },
  { id: "flamula_alta", nome: "Flâmula de Alta" },
  { id: "flamula_baixa", nome: "Flâmula de Baixa" },
  { id: "cunha_alta", nome: "Cunha de Alta" },
  { id: "cunha_baixa", nome: "Cunha de Baixa" },
  { id: "canal_alta", nome: "Canal de Alta" },
  { id: "canal_baixa", nome: "Canal de Baixa" },
  // consolidação
  { id: "triangulo_ascendente", nome: "Triângulo Asc." },
  { id: "triangulo_descendente", nome: "Triângulo Desc." },
  { id: "triangulo_simetrico", nome: "Triângulo Sim." },
  { id: "retangulo", nome: "Retângulo" },
  { id: "niveis", nome: "Suporte/Resistência" },
];

export const DISPONIVEIS = PADROES_DO_FILTRO.filter((p) => !p.emBreve).map((p) => p.id);

/**
 * Com o que o sidebar abre: SÓ o padrão da tela.
 *
 * Antes abria com tudo ligado e o gráfico vinha coberto de emoji de
 * outros padrões — justamente na hora de marcar, que é quando se precisa
 * ver o preço. Quem quiser conferir os outros marca na mão; a escolha
 * vale enquanto a tela estiver aberta e volta ao padrão da página na
 * próxima (era guardada no localStorage, e aí "só o padrão atual" nunca
 * acontecia de verdade).
 */
export function filtroInicial(padraoDaTela) {
  return DISPONIVEIS.includes(padraoDaTela) ? [padraoDaTela] : [];
}
