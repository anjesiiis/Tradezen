/**
 * TRADEZEN — FORÇA DA SENHA
 * =========================
 *
 * Em arquivo próprio porque a tela de cadastro exporta um componente, e
 * misturar dado/função com componente no mesmo módulo quebra o hot
 * reload do Vite — e porque assim a regra dá pra testar sozinha, sem
 * montar formulário nenhum.
 *
 * As cores são as da paleta (auth/theme.jsx): `--down` vermelho, `--gold`
 * âmbar, `--up` verde. Nada de cor nova.
 */

export const CRITERIOS = [
  { id: "tamanho", rotulo: "Pelo menos 8 caracteres", testa: (s) => s.length >= 8 },
  { id: "maiuscula", rotulo: "Uma letra maiúscula (A-Z)", testa: (s) => /[A-Z]/.test(s) },
  { id: "minuscula", rotulo: "Uma letra minúscula (a-z)", testa: (s) => /[a-z]/.test(s) },
  { id: "numero", rotulo: "Um número (0-9)", testa: (s) => /[0-9]/.test(s) },
  {
    id: "especial",
    rotulo: "Um caractere especial (!@#$...)",
    // Qualquer coisa que não seja letra, número ou espaço. Escrito assim,
    // e não como uma lista de símbolos, porque lista deixa de fora o que
    // ninguém lembrou — e aí a pessoa põe um "ç", um "€" ou um "–" e o
    // site diz que não vale, sem explicar por quê.
    testa: (s) => /[^A-Za-z0-9\s]/.test(s),
  },
];

const NIVEIS = {
  fraca: { nivel: "fraca", rotulo: "Senha fraca", cor: "var(--down)" },
  media: { nivel: "media", rotulo: "Senha média", cor: "var(--gold)" },
  forte: { nivel: "forte", rotulo: "Senha forte", cor: "var(--up)" },
};

/**
 * Avalia a senha em tempo real.
 *
 * @param {string} senha
 * @returns {{criterios: Record<string, boolean>, atendidos: number,
 *            total: number, nivel: "fraca"|"media"|"forte",
 *            rotulo: string, cor: string, forte: boolean}}
 */
export function avaliarSenha(senha = "") {
  const criterios = {};
  for (const c of CRITERIOS) criterios[c.id] = c.testa(senha);
  const atendidos = Object.values(criterios).filter(Boolean).length;

  // "Forte" exige TODOS. Não é rigor por rigor: é o que o botão de criar
  // conta espera, e dizer "forte" com um critério faltando seria mentira.
  let faixa = NIVEIS.fraca;
  if (atendidos === CRITERIOS.length) faixa = NIVEIS.forte;
  else if (atendidos >= 3) faixa = NIVEIS.media;

  return {
    criterios,
    atendidos,
    total: CRITERIOS.length,
    ...faixa,
    forte: atendidos === CRITERIOS.length,
  };
}
