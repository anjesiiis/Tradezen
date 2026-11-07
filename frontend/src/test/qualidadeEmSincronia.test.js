import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NIVEIS } from '../admin/qualidade.js';

// Lê os arquivos do backend de propósito: é o único jeito de o teste do
// frontend notar que o backend mudou. path.resolve e nao new URL(...,
// import.meta.url) — o Vite enxerga a segunda forma como import de asset
// e recusa caminho fora da raiz do projeto.
const RAIZ_BACKEND = resolve(process.cwd(), '..', 'backend');
const ler = (caminho) => readFileSync(resolve(RAIZ_BACKEND, caminho), 'utf8');

const SQL = () => ler('sql/026_qualidade_da_marcacao.sql');
const PY = () => ler('admin_qualidade.py');

describe('a migration 026 cobre as mesmas tabelas do status', () => {
  const tabelasDe = (texto) =>
    [...texto.matchAll(/'(templates_\w+)'/g)].map((m) => m[1]).sort();

  it('a 026 e a 025 atendem exatamente as mesmas tabelas', () => {
    const na026 = [...new Set(tabelasDe(SQL()))];
    const na025 = [...new Set(tabelasDe(ler('sql/025_status_revisao.sql')))];
    expect(na026).toEqual(na025);
    expect(na026).toHaveLength(21);
  });

  // Níveis é tela de marcação como as outras: tem ticker, timeframe,
  // resultado e rota própria. Deixá-la de fora dá uma tela sem nota.
  it('inclui templates_niveis', () => {
    expect(tabelasDe(SQL())).toContain('templates_niveis');
  });

  it('a trava do banco é a escala 0 a 4', () => {
    expect(SQL()).toMatch(/qualidade between 0 and 4/i);
  });

  // NULL é "ninguém avaliou", e não é o mesmo que "avaliei e é média".
  // Preencher tudo com 2 criaria 212 avaliações que nenhum humano deu —
  // e é esse dado que vai pro treino.
  it('não preenche nota nenhuma nas marcações que já existem', () => {
    expect(SQL()).not.toMatch(/update\s+.*set\s+qualidade\s*=\s*\d/i);
  });

  // O cache do PostgREST responde "coluna nao existe" pra coluna que
  // acabou de nascer, e o sintoma fica igual a migration nao rodada.
  it('recarrega o schema do PostgREST no fim', () => {
    expect(SQL()).toMatch(/notify pgrst, 'reload schema'/);
  });
});

describe('qualidade e resultado são eixos separados', () => {
  // `resultado` é o DESFECHO, texto livre digitado na tela. Derivar um do
  // outro apagaria um dos dois: um padrão de livro que não andou é
  // qualidade 4 com resultado ruim.
  it('o endpoint de qualidade nunca escreve na coluna resultado', () => {
    expect(PY()).not.toMatch(/"resultado"|'resultado'/);
  });

  it('não existe coluna classificacao em lugar nenhum do backend', () => {
    expect(PY()).not.toContain('classificacao');
    expect(SQL()).not.toContain('classificacao');
  });
});

describe('backend e tela falam a mesma língua', () => {
  it('os rótulos dos cinco níveis são idênticos nos dois lados', () => {
    const noPy = [...PY().matchAll(/ROTULOS = \{([^}]+)\}/g)][0][1];
    for (const n of NIVEIS) {
      expect(noPy, `${n.valor} = ${n.rotulo}`).toContain(`${n.valor}: "${n.rotulo}"`);
    }
  });

  it('o alvo contínuo do ML vai de 0.0 a 1.0, um valor por nível', () => {
    const score = [...PY().matchAll(/_SCORE = \{([^}]+)\}/g)][0][1];
    for (const [nivel, valor] of [[0, '0.0'], [1, '0.3'], [2, '0.6'], [3, '0.8'], [4, '1.0']]) {
      expect(score, `nível ${nivel}`).toContain(`${nivel}: ${valor}`);
    }
  });

  // Uma segunda lista com os mesmos 21 nomes só serviria pra sair de
  // sincronia: a rota é a mesma palavra nas duas features.
  it('o router reusa a lista de tabelas do status, sem copiá-la', () => {
    expect(PY()).toMatch(/from admin_status_revisao import TABELAS/);
    expect(PY()).not.toMatch(/TABELAS\s*:\s*Dict/);
  });

  it('o router está registrado no main.py', () => {
    const main = ler('main.py');
    expect(main).toMatch(/from admin_qualidade import router as admin_qualidade_router/);
    expect(main).toMatch(/app\.include_router\(admin_qualidade_router\)/);
  });
});
