// Os padrões agrupados por família — é o que o menu lateral do admin
// desenha (AdminPatternNav, em theme.jsx).
//
// Fica num arquivo só seu porque theme.jsx exporta componentes: misturar
// dado e componente no mesmo módulo quebra o hot reload do Vite.
//
// `key` é a chave que cada tela passa como `active`; `id` é o id do
// padrão (serve pro emoji); `href` é a rota, que NÃO muda.
export const GRUPOS_DE_PADRAO = [
  {
    id: "reversao", nome: "Reversão", emoji: "🔴🟢",
    itens: [
      { key: "topo-duplo", id: "topo_duplo", label: "Topo Duplo", href: "/admin/templates/topo-duplo" },
      { key: "fundo-duplo", id: "fundo_duplo", label: "Fundo Duplo", href: "/admin/templates/fundo-duplo" },
      { key: "topo-triplo", id: "topo_triplo", label: "Topo Triplo", href: "/admin/templates/topo-triplo" },
      { key: "fundo-triplo", id: "fundo_triplo", label: "Fundo Triplo", href: "/admin/templates/fundo-triplo" },
      { key: "oco", id: "oco", label: "OCO", href: "/admin/templates" },
      { key: "oco-invertido", id: "oco_invertido", label: "OCO Invertido", href: "/admin/templates/oco-invertido" },
    ],
  },
  {
    id: "continuacao", nome: "Continuação", emoji: "🔵🟡",
    itens: [
      { key: "bandeira-alta", id: "bandeira_alta", label: "Bandeira de Alta", href: "/admin/templates/bandeira-alta" },
      { key: "bandeira-baixa", id: "bandeira_baixa", label: "Bandeira de Baixa", href: "/admin/templates/bandeira-baixa" },
      { key: "flamula-alta", id: "flamula_alta", label: "Flâmula de Alta", href: "/admin/templates/flamula-alta" },
      { key: "flamula-baixa", id: "flamula_baixa", label: "Flâmula de Baixa", href: "/admin/templates/flamula-baixa" },
      { key: "cunha-alta", id: "cunha_alta", label: "Cunha de Alta", href: "/admin/templates/cunha-alta" },
      { key: "cunha-baixa", id: "cunha_baixa", label: "Cunha de Baixa", href: "/admin/templates/cunha-baixa" },
    ],
  },
  {
    id: "canais", nome: "Canais e Triângulos", emoji: "🔵",
    itens: [
      { key: "canal-alta", id: "canal_alta", label: "Canal de Alta", href: "/admin/templates/canal-alta" },
      { key: "canal-baixa", id: "canal_baixa", label: "Canal de Baixa", href: "/admin/templates/canal-baixa" },
      { key: "triangulo-ascendente", id: "triangulo_ascendente", label: "Triângulo Ascendente", href: "/admin/templates/triangulo-ascendente" },
      { key: "triangulo-descendente", id: "triangulo_descendente", label: "Triângulo Descendente", href: "/admin/templates/triangulo-descendente" },
      { key: "triangulo-simetrico", id: "triangulo_simetrico", label: "Triângulo Simétrico", href: "/admin/templates/triangulo-simetrico" },
    ],
  },
  {
    id: "neutros", nome: "Neutros", emoji: "⬜💡",
    itens: [
      { key: "retangulo", id: "retangulo", label: "Retângulo", href: "/admin/templates/retangulo" },
      { key: "niveis", id: "niveis", label: "Suporte/Resistência", href: "/admin/templates/niveis" },
    ],
  },
];

export function grupoDoPadrao(chave) {
  return GRUPOS_DE_PADRAO.find((g) => g.itens.some((i) => i.key === chave)) || null;
}
