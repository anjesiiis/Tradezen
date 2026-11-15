/**
 * TRADEZEN — O DESFECHO DA MARCAÇÃO (coluna `resultado`)
 * =====================================================
 *
 * `resultado` é TEXTO LIVRE digitado na tela de marcação ("ex: sucesso,
 * falha"), e por isso o banco tem de tudo: "Sucesso", "sucesso", "falhou",
 * "não andou", "deu certo", vazio. Mostrar esse texto cru não deixa a
 * pessoa ver de longe como está o conjunto — era preciso ler linha por
 * linha pra saber quantos padrões deram certo.
 *
 * Aqui o texto é CLASSIFICADO em três, e só isso: sucesso, falha ou
 * indefinido. A classificação é de LEITURA — nada é regravado no banco, e
 * o texto original continua aparecendo ao lado do selo. Se a classificação
 * errar, a pessoa vê o que ela mesma escreveu e corrige o texto.
 *
 * FALHA É TESTADA PRIMEIRO, de propósito: "não teve sucesso" e "sem
 * sucesso" contêm a palavra "sucesso". Checar sucesso antes marcaria de
 * verde justamente o que falhou — o pior erro possível nesta tela.
 *
 * NÃO É A QUALIDADE. São eixos diferentes (ver qualidade.js): `qualidade`
 * é quão bom exemplo da FORMA o desenho é; `resultado` é o que aconteceu
 * depois. Um padrão de livro que não andou é qualidade alta com resultado
 * de falha, e derivar um do outro apagaria um dos dois.
 */

const semAcento = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
const normalizar = (t) => semAcento(String(t ?? "").toLowerCase()).trim();

// Prefixos em vez de palavras inteiras onde a conjugação varia: "falh"
// pega falha/falhou/falhei/falhado sem precisar listar os quatro.
const FALHA = [
  /falh/, /fracass/, /\bnao\b/, /\bsem\b/, /\berrou\b/, /\bruim\b/,
  /invalid/, /\bstop\b/, /\bperdeu\b/, /\bnegativ/,
];

const SUCESSO = [
  /\bsuc/, /\bcerto\b/, /funcionou/, /confirm/, /\bandou\b/, /\bok\b/,
  /\bbom\b/, /\batingiu\b/, /\balvo\b/, /\bganhou\b/, /\bpositiv/,
];

/** "sucesso" | "falha" | "indefinido" — nunca null, pra quem usa como chave. */
export function classificarResultado(texto) {
  const t = normalizar(texto);
  if (!t) return "indefinido";
  if (FALHA.some((r) => r.test(t))) return "falha";
  if (SUCESSO.some((r) => r.test(t))) return "sucesso";
  return "indefinido";
}

export const ROTULO_RESULTADO = {
  sucesso: "Sucesso",
  falha: "Falha",
  indefinido: "Indefinido",
};

/** Quantos de cada, na lista inteira. As três chaves vêm sempre, mesmo em 0:
 *  contador que esconde o zero faz "nenhuma falha" parecer "não calculei". */
export function contarResultados(templates) {
  const contas = { sucesso: 0, falha: 0, indefinido: 0 };
  for (const t of templates || []) contas[classificarResultado(t?.resultado)] += 1;
  return contas;
}
