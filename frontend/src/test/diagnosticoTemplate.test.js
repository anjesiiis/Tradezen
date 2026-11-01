import { explicarFalhaAoAbrir, problemaNoTemplate, registrarFalha } from '../admin/diagnosticoTemplate.js';

// O bug era um `catch {}` sem argumento em seis telas do admin: tudo
// virava "Não foi possível abrir este template", e o recado do backend —
// que é o que diz o que fazer — ia pro lixo ali. Estes testes travam que
// cada causa produz uma frase DIFERENTE e acionável.

const erro = (status, detail) => {
  const e = new Error(detail || `Erro ${status}`);
  e.status = status;
  e.data = detail ? { detail } : null;
  return e;
};

describe('Explicar por que o template não abriu', () => {
  it('a mensagem genérica de antes não voltou', () => {
    for (const s of [401, 403, 404, 422, 429, 500, 502, 503]) {
      expect(explicarFalhaAoAbrir(erro(s), 7)).not.toMatch(/Não foi possível abrir este template\.$/);
    }
  });

  // Cada causa pede uma AÇÃO diferente: pedir link novo, atualizar a
  // lista, rodar migration, esperar. Uma frase só não serve pra nenhuma.
  it.each([
    [401, /sessão de admin venceu/i],
    [403, /sessão de admin venceu/i],
    [404, /não está mais no banco/i],
    [422, /endereço.*inválido/i],
    [429, /muitos pedidos/i],
    [500, /servidor falhou/i],
  ])('status %i diz o que fazer', (status, esperado) => {
    expect(explicarFalhaAoAbrir(erro(status), 7)).toMatch(esperado);
  });

  it('o número do HTTP vai junto, pra poder colar num pedido de ajuda', () => {
    expect(explicarFalhaAoAbrir(erro(404), 7)).toMatch(/\(404\)/);
    expect(explicarFalhaAoAbrir(erro(500), 7)).toMatch(/\(500\)/);
  });

  it('o id do template aparece — é por ele que se cruza com o SQL', () => {
    expect(explicarFalhaAoAbrir(erro(404), 123)).toMatch(/123/);
    expect(explicarFalhaAoAbrir(erro(500), 123)).toMatch(/123/);
  });

  // 503 é a nossa própria mensagem de "rode a migration tal": ela já diz
  // o arquivo, então passa inteira em vez de ser resumida.
  it('503 repassa o recado do backend, que nomeia a migration', () => {
    const texto = explicarFalhaAoAbrir(
      erro(503, 'A tabela templates_bandeira_alta_fracasso ainda não existe no Supabase. Rode backend/sql/016_fracassos_bandeira.sql'),
      7,
    );
    expect(texto).toMatch(/016_fracassos_bandeira\.sql/);
  });

  it('erro de servidor mostra o detalhe que o backend mandou', () => {
    expect(explicarFalhaAoAbrir(erro(500, 'coluna pontos não existe'), 7))
      .toMatch(/coluna pontos não existe/);
  });

  // Sem `status` não houve resposta: backend dormindo no Render, rede
  // caída, ou estouro no próprio navegador. São coisas diferentes de um
  // 404 e a frase tem que dizer isso.
  it('sem resposta nenhuma, fala de conexão e não de template', () => {
    const semStatus = new Error('');
    expect(explicarFalhaAoAbrir(semStatus, 7)).toMatch(/falar com o servidor|conexão/i);
  });

  it('erro de JavaScript mostra a própria mensagem', () => {
    expect(explicarFalhaAoAbrir(new TypeError('x is not a function'), 7))
      .toMatch(/x is not a function/);
  });

  it('não explode sem erro nenhum nem sem id', () => {
    expect(typeof explicarFalhaAoAbrir(null, null)).toBe('string');
    expect(typeof explicarFalhaAoAbrir(undefined, undefined)).toBe('string');
  });
});

describe('O template veio, mas dá pra desenhar?', () => {
  const bom = {
    ticker: 'PETR4.SA',
    candles: [{ timestamp: 1, open: 1, high: 2, low: 0, close: 1 }],
    pontos: { p1: { i: 0, preco: 1 } },
  };

  it('template íntegro passa', () => {
    expect(problemaNoTemplate(bom)).toBeNull();
  });

  // Este é o caso que fazia o gráfico abrir VAZIO e parecer que o
  // TradeZen tinha perdido a marcação — quando o que faltava era o dado.
  it.each([
    ['sem candles', { ...bom, candles: [] }, /sem os candles/i],
    ['candles nulo', { ...bom, candles: null }, /sem os candles/i],
    ['candles que não é lista', { ...bom, candles: { 0: {} } }, /sem os candles/i],
    ['sem ticker', { ...bom, ticker: '' }, /sem o ativo/i],
    ['sem pontos', { ...bom, pontos: {} }, /sem os pontos/i],
    ['pontos nulo', { ...bom, pontos: null }, /sem os pontos/i],
    ['pontos lista vazia', { ...bom, pontos: [] }, /sem os pontos/i],
    ['resposta sem template', null, /sem o template/i],
    ['resposta que não é objeto', 'ok', /sem o template/i],
  ])('%s é apontado', (_nome, t, esperado) => {
    expect(problemaNoTemplate(t)).toMatch(esperado);
  });

  // Níveis guarda os pontos como { toques: [...] } — formato diferente do
  // das bandeiras, e tem que passar igual.
  it('aceita o formato de pontos dos Níveis', () => {
    expect(problemaNoTemplate({ ...bom, pontos: { toques: [{ i: 3 }] } })).toBeNull();
  });
});

describe('Registro no console', () => {
  it('leva o id e o status, que é o que permite entender sem reproduzir', () => {
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      registrarFalha('abrir template', 42, erro(500, 'quebrou'));

      const [, dados] = espiao.mock.calls[0];
      expect(dados.templateId).toBe(42);
      expect(dados.status).toBe(500);
      expect(dados.detail).toBe('quebrou');
    } finally {
      espiao.mockRestore();
    }
  });

  it('erro sem status é registrado como "sem resposta", não como undefined', () => {
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      registrarFalha('abrir template', 42, new Error('rede'));
      expect(espiao.mock.calls[0][1].status).toBe('(sem resposta)');
    } finally {
      espiao.mockRestore();
    }
  });
});
