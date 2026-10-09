// Lista e persistência do filtro de padrões do gráfico de marcação.
//
// Fica fora do componente porque três telas leem daqui (OCO, topo duplo e
// a compartilhada de bandeira/flâmula/cunha/canal) e porque o estado
// inicial é lido antes de qualquer render.

const CHAVE = "tradezen_filtro_padroes";

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

const DISPONIVEIS = PADROES_DO_FILTRO.filter((p) => !p.emBreve).map((p) => p.id);

/**
 * Começa com TUDO ligado: abrir um ativo tem que mostrar na hora o que já
 * foi marcado nele, de qualquer padrão — é o aviso de "não marque isso de
 * novo". Quem quiser limpar a tela desmarca, e a escolha fica salva.
 */
export function lerFiltroSalvo() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    if (!Array.isArray(salvo)) return [...DISPONIVEIS];
    // ignora id que não existe mais (padrão renomeado, lixo de outra versão)
    return salvo.filter((id) => DISPONIVEIS.includes(id));
  } catch {
    return [...DISPONIVEIS];   // localStorage bloqueado ou com conteúdo inválido
  }
}

export function guardarFiltro(ligados) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(ligados));
  } catch { /* sem localStorage, a escolha vale só enquanto a aba está aberta */ }
}
