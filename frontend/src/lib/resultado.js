// Como ler o campo `resultado` de um template.
//
// Ele é texto livre e foi preenchido à mão ao longo de meses: "sucesso",
// "sucess" (sem o "o"), "sucesso,porem", "sucesso com questionamento",
// "falhou", "falha". Qualquer filtro por igualdade erra — e erra calado,
// que é o pior jeito de errar na hora de montar o conjunto de treino.
//
// Em templates_niveis o campo virou o TIPO (suporte/resistência), não o
// desfecho; por isso "indefinido" é uma resposta legítima aqui.

export const DESFECHOS = ["sucesso", "falhou", "indefinido"];

/** "sucesso" | "falhou" | "indefinido" — sempre uma dessas três. */
export function lerDesfecho(texto) {
  const t = (texto || "").trim().toLowerCase();
  if (!t) return "indefinido";
  if (t.startsWith("falh")) return "falhou";
  // "sucess" sem o "o" é erro de digitação real nos dados
  if (t.startsWith("suces") || t.startsWith("sucess")) return "sucesso";
  return "indefinido";
}

export function falhou(texto) {
  return lerDesfecho(texto) === "falhou";
}

export function deuCerto(texto) {
  return lerDesfecho(texto) === "sucesso";
}

/** Rótulo curto pra mostrar na tela. */
export function rotuloDoDesfecho(texto) {
  return { sucesso: "Sucesso", falhou: "Falhou", indefinido: "Indefinido" }[lerDesfecho(texto)];
}
