// Lista e persistência do filtro de padrões do gráfico de marcação.
//
// Fica fora do componente porque três telas leem daqui (OCO, topo duplo e
// a compartilhada de bandeira/flâmula/cunha/canal) e porque o estado
// inicial é lido antes de qualquer render.

const CHAVE = "tradezen_filtro_padroes";

// Os que existem no banco hoje têm tabela e podem ter template salvo. Os
// de "em breve" ficam na lista de propósito: mostram o que o detector
// ainda não cobre, em vez de dar a impressão de que a lista é só isso.
export const PADROES_DO_FILTRO = [
  { id: "topo_duplo", nome: "Topo Duplo" },
  { id: "fundo_duplo", nome: "Fundo Duplo", emBreve: true },
  { id: "bandeira_alta", nome: "Bandeira de Alta" },
  { id: "bandeira_baixa", nome: "Bandeira de Baixa" },
  { id: "flamula_alta", nome: "Flâmula de Alta" },
  { id: "flamula_baixa", nome: "Flâmula de Baixa" },
  { id: "cunha_alta", nome: "Cunha de Alta" },
  { id: "cunha_baixa", nome: "Cunha de Baixa" },
  { id: "canal_alta", nome: "Canal de Alta" },
  { id: "canal_baixa", nome: "Canal de Baixa" },
  { id: "oco", nome: "OCO" },
  { id: "oco_invertido", nome: "OCO Invertido", emBreve: true },
  { id: "topo_triplo", nome: "Topo Triplo", emBreve: true },
  { id: "fundo_triplo", nome: "Fundo Triplo", emBreve: true },
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
