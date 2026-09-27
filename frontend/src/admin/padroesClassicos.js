// Pontos do OCO e do Topo Duplo. Ficam aqui (e não dentro da tela de cada
// um) porque o desenho de um template salvo pode ser aberto de QUALQUER
// tela pela 💡 — quem está marcando uma bandeira precisa conseguir ver o
// OCO que já existe ali do lado, com as cores e as linhas certas dele.

export const STEPS_OCO = [
  { key: "comeco", label: "Começo", short: "I", color: "#5A7299" },
  { key: "topo_ombro_esq", label: "Topo Ombro Esquerdo", short: "TOE", color: "#3D7EFF" },
  { key: "fundo_ombro_esq", label: "Fundo Ombro Esquerdo", short: "FOE", color: "#9B6DFF" },
  { key: "topo_cabeca", label: "Topo Cabeça", short: "TC", color: "#F5A623" },
  { key: "fundo_cabeca", label: "Fundo Cabeça", short: "FC", color: "#9B6DFF" },
  { key: "inicio_ombro_dir", label: "Início Ombro Direito", short: "IOD", color: "#00D68F" },
  { key: "topo_ombro_dir", label: "Topo Ombro Direito", short: "TOD", color: "#3D7EFF" },
];

// A neckline: a linha que liga os dois fundos
export const LINE_PAIRS_OCO = [["fundo_ombro_esq", "fundo_cabeca"]];

export const STEPS_TOPO_DUPLO = [
  { key: "topo1", label: "Topo 1", short: "T1", color: "#3D7EFF" },
  { key: "vale", label: "Vale", short: "V", color: "#9B6DFF" },
  { key: "topo2", label: "Topo 2", short: "T2", color: "#3D7EFF" },
];

// Linha entre os dois topos, pra o padrão salvo aparecer desenhado e não só
// como três pontos soltos
export const LINE_PAIRS_TOPO_DUPLO = [["topo1", "topo2"]];
