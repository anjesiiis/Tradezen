import { pontosNaoReconhecidos } from '../admin/diagnosticoTemplate.js';
import { PADROES, PASSOS_PARES, configDoTemplate } from '../admin/bandeira.js';

// O SILÊNCIO QUE ESCONDIA O BUG
// =============================
//
// Um template com `pontos` gravados em formato desconhecido passa pelo
// problemaNoTemplate (tem chaves, então "existe"), cai no fallback legado
// do configDoTemplate, nenhum step encontra o seu ponto, e o gráfico
// desenha SÓ OS CANDLES — sem uma palavra de explicação.
//
// Foi exatamente esse o relato: "não aparece o desenho". A tela não tinha
// como dizer o que estava errado, e nem eu.

const paresValidos = Object.fromEntries(
  PASSOS_PARES.map((k, i) => [k, { i: i * 3, preco: 10 + i }])
);

describe('pontos em formato que a tela não reconhece', () => {
  it('avisa, e o aviso diz quais chaves estão gravadas', () => {
    const steps = configDoTemplate(paresValidos, PADROES.bandeira_alta).steps;
    const aviso = pontosNaoReconhecidos({ cabeca: { i: 1, preco: 2 } }, steps);
    expect(aviso).toBeTruthy();
    expect(aviso).toMatch(/cabeca/);              // o que está lá
    expect(aviso).toMatch(/p1_inicio_mastro1/);   // o que a tela esperava
  });

  it('fica calado quando os pontos casam — sucesso', () => {
    const steps = configDoTemplate(paresValidos, PADROES.bandeira_alta).steps;
    expect(pontosNaoReconhecidos(paresValidos, steps)).toBeNull();
  });

  it('fica calado quando os pontos casam — FRACASSO', () => {
    // a mesma marcação, na tela de fracasso: o desenho é o mesmo e o
    // aviso não pode aparecer por engano
    const steps = configDoTemplate(paresValidos, PADROES.bandeira_alta_fracasso).steps;
    expect(pontosNaoReconhecidos(paresValidos, steps)).toBeNull();
  });

  it('um ponto só que casa já basta pra desenhar algo, e não avisa', () => {
    const steps = configDoTemplate(paresValidos, PADROES.bandeira_alta).steps;
    const parcial = { p1_inicio_mastro1: { i: 0, preco: 10 } };
    expect(pontosNaoReconhecidos(parcial, steps)).toBeNull();
  });

  it('pontos vazios ou ausentes são outro caso, tratado em problemaNoTemplate', () => {
    const steps = configDoTemplate(paresValidos, PADROES.bandeira_alta).steps;
    expect(pontosNaoReconhecidos({}, steps)).toBeNull();
    expect(pontosNaoReconhecidos(null, steps)).toBeNull();
    expect(pontosNaoReconhecidos(undefined, steps)).toBeNull();
  });

  it('tela sem steps não gera aviso', () => {
    expect(pontosNaoReconhecidos({ x: 1 }, [])).toBeNull();
    expect(pontosNaoReconhecidos({ x: 1 }, undefined)).toBeNull();
  });

  it('array no lugar de objeto não quebra', () => {
    const steps = configDoTemplate(paresValidos, PADROES.bandeira_alta).steps;
    expect(() => pontosNaoReconhecidos([1, 2, 3], steps)).not.toThrow();
  });
});

// A PROVA DE QUE O DESENHO NÃO DIFERENCIA SUCESSO DE FRACASSO
// ==========================================================
//
// Isto foi medido antes de mexer em qualquer coisa, e é o que descartou
// metade das hipóteses: dado o MESMO `pontos`, a tela de fracasso monta o
// mesmo desenho da de sucesso. Fica como teste pra nunca mais ser preciso
// descobrir isso de novo — e pra quebrar se alguém desligar as linhas no
// fracasso achando que "contraexemplo não precisa de linha".
describe('fracasso desenha igual ao sucesso', () => {
  for (const [nome, ok, falha] of [
    ['bandeira de alta', 'bandeira_alta', 'bandeira_alta_fracasso'],
    ['bandeira de baixa', 'bandeira_baixa', 'bandeira_baixa_fracasso'],
  ]) {
    it(`${nome}: mesmos pontos e mesmas linhas`, () => {
      const cOk = configDoTemplate(paresValidos, PADROES[ok]);
      const cFalha = configDoTemplate(paresValidos, PADROES[falha]);

      expect(cFalha.steps.length).toBe(cOk.steps.length);
      expect(cFalha.steps.map((s) => s.key)).toEqual(cOk.steps.map((s) => s.key));

      expect(typeof cFalha.linhas).toBe('function');
      expect(cFalha.linhas(paresValidos, []).length).toBe(cOk.linhas(paresValidos, []).length);
      // 4 linhas: é o que faz a bandeira ser lida como bandeira
      expect(cFalha.linhas(paresValidos, []).length).toBe(4);
    });
  }
});
