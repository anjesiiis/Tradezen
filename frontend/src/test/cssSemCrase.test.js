import { CSS } from '../styles/appCss.js';
import { VENDAS_CSS } from '../styles/vendasCss.js';

// Os dois arquivos guardam o CSS num template literal. Uma crase dentro
// de um comentário fecha a string e quebra o build inteiro, com uma
// mensagem de parse que não aponta pra causa ("Unexpected token cover").
// Já aconteceu quatro vezes. Crase não tem uso nenhum em CSS, então a
// regra é simples: não existe nenhuma ali dentro.
describe('CSS em template literal', () => {
  it.each([['appCss', CSS], ['vendasCss', VENDAS_CSS]])('%s não usa crase', (nome, css) => {
    const linha = css.split('\n').findIndex((l) => l.includes('`')) + 1;
    expect(css.includes('`'), `crase na linha ${linha} do CSS de ${nome} — use aspas`).toBe(false);
  });
});
