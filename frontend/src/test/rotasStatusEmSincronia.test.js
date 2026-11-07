import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROTA_DO_STATUS } from '../admin/adminApi.js';

// A mesma lista de 21 tabelas existe em três lugares: a migration 025, o
// TABELAS do admin_status_revisao.py e o ROTA_DO_STATUS daqui. Acrescentar
// um padrão novo e esquecer um dos três dá uma tela que simplesmente não
// mostra status, sem erro nenhum pra investigar.
//
// Lê os arquivos do backend de propósito: é o único jeito de o teste do
// frontend notar que o backend mudou.
// path.resolve e nao new URL(..., import.meta.url): o Vite enxerga a
// segunda forma como import de asset e recusa caminho fora da raiz do
// projeto. Aqui o caminho se monta em tempo de execucao.
const RAIZ_BACKEND = resolve(process.cwd(), '..', 'backend');
const ler = (caminho) => readFileSync(resolve(RAIZ_BACKEND, caminho), 'utf8');

const rotasDoRouter = () => {
  const py = ler('admin_status_revisao.py');
  const bloco = py.slice(py.indexOf('TABELAS: Dict[str, str] = {'), py.indexOf('STATUS_VALIDOS'));
  return [...bloco.matchAll(/"([\w-]+)": "(templates_\w+)"/g)].map((m) => ({ rota: m[1], tabela: m[2] }));
};

describe('As três listas de tabelas concordam', () => {
  it('o backend conhece as 21 tabelas de marcação', () => {
    expect(rotasDoRouter()).toHaveLength(21);
  });

  it('toda rota do backend tem um padrão apontando pra ela no frontend', () => {
    const doFrontend = new Set(Object.values(ROTA_DO_STATUS));
    for (const { rota } of rotasDoRouter()) {
      expect(doFrontend, `rota ${rota} não está em ROTA_DO_STATUS`).toContain(rota);
    }
  });

  it('nenhuma rota do frontend aponta pra lugar que o backend não conhece', () => {
    const doBackend = new Set(rotasDoRouter().map((r) => r.rota));
    for (const [padrao, rota] of Object.entries(ROTA_DO_STATUS)) {
      expect(doBackend, `${padrao} aponta pra "${rota}", que o backend não tem`).toContain(rota);
    }
  });

  it('a migration cobre exatamente as tabelas que o backend atende', () => {
    const sql = ler('sql/025_status_revisao.sql');
    const naMigration = new Set([...sql.matchAll(/'(templates_\w+)'/g)].map((m) => m[1]));
    for (const { tabela } of rotasDoRouter()) {
      expect(naMigration, `${tabela} não está na migration 025`).toContain(tabela);
    }
    expect(naMigration.size).toBe(21);
  });

  // Os cinco valores vivem na trava CHECK do banco, na validação do
  // endpoint e na tela. Um a mais num só lugar vira 400 sem explicação.
  it('os cinco status são os mesmos no banco e no endpoint', () => {
    const py = ler('admin_status_revisao.py');
    const sql = ler('sql/025_status_revisao.sql');
    const esperados = ['nao_visto', 'aberto', 'visto', 'em_andamento', 'revisto'];

    const noEndpoint = [...py.matchAll(/STATUS_VALIDOS = \(([^)]+)\)/g)][0][1];
    for (const s of esperados) {
      expect(noEndpoint, `${s} no STATUS_VALIDOS`).toContain(`"${s}"`);
      expect(sql, `${s} na trava CHECK`).toContain(`'${s}'`);
    }
  });

  // As quatro colunas, pelo nome exato que o endpoint usa. Mais de uma
  // vez chegou uma versão "corrigida" da 025 com `visto_em` no lugar de
  // `status_em` — a coluna fica faltando, o endpoint responde 503 e o
  // sintoma é idêntico a não ter rodado migration nenhuma.
  it('a migration cria as colunas com o nome que o endpoint lê', () => {
    const py = ler('admin_status_revisao.py');
    const sql = ler('sql/025_status_revisao.sql');
    const colunas = [...py.matchAll(/_COLUNAS = "([^"]+)"/g)][0][1]
      .split(',').filter((c) => c !== 'id');

    expect(colunas).toContain('status_em');
    for (const coluna of colunas) {
      expect(sql, `coluna ${coluna} na migration`).toMatch(
        new RegExp(`add column if not exists ${coluna}\\b`, 'i'));
    }
  });

  // `require_admin` devolve o EMAIL do admin, e é ele que vai pra
  // `revisto_por`. Declarar a coluna como uuid (referenciando
  // auth.users) faz todo clique em "Revisto" falhar por tipo.
  it('revisto_por é text, porque o que se grava ali é email', () => {
    const sql = ler('sql/025_status_revisao.sql');
    expect(sql).toMatch(/add column if not exists revisto_por text/i);
    expect(sql).not.toMatch(/revisto_por\s+uuid/i);

    const auth = ler('admin_auth.py');
    expect(auth, 'require_admin devolve email').toMatch(/email = user\.email/);
  });
});

describe('CORS deixa passar todo método que o frontend usa', () => {
  // O bug que isto previne, medido em produção: `allow_methods` não tinha
  // PATCH, então o preflight voltava 400 e o NAVEGADOR recusava o pedido
  // antes de mandá-lo. A tela mostrava "Load failed" — o texto do WebKit
  // pra falha de rede —, que não parece erro de permissão nem de banco, e
  // por isso o diagnóstico foi pra migration, que era outro assunto.
  //
  // Pegava as duas rotas de PATCH que existem: status de revisão e troca
  // de plano do usuário no admin.
  const metodosDoCors = () => {
    const main = ler('main.py');
    const m = main.match(/allow_methods=\[([^\]]+)\]/);
    return new Set([...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1]));
  };

  const metodosDoFrontend = () => {
    const usados = new Set(['GET']);   // o default do fetch
    for (const arquivo of ['../frontend/src/admin/adminApi.js', '../frontend/src/lib/api.js']) {
      let texto;
      try { texto = ler(arquivo); } catch { continue; }
      for (const m of texto.matchAll(/method:\s*["'](\w+)["']/g)) usados.add(m[1].toUpperCase());
    }
    return usados;
  };

  it('PATCH está liberado — era ele que faltava', () => {
    expect(metodosDoCors()).toContain('PATCH');
  });

  it('OPTIONS está liberado, senão nenhum preflight passa', () => {
    expect(metodosDoCors()).toContain('OPTIONS');
  });

  it('todo método que o frontend manda está no allow_methods', () => {
    const liberados = metodosDoCors();
    for (const metodo of metodosDoFrontend()) {
      expect(liberados, `o frontend manda ${metodo} e o CORS não libera`).toContain(metodo);
    }
  });
});

// A 027 conserta tabela que ficou com resquício de versão errada da 025.
// O banner vermelho quer dizer que o select do backend falhou, e como a
// 026 funciona na mesma tabela, com a mesma auth, só pode ser coluna.
describe('a 027 conserta a 025 sem tocar na 026', () => {
  const SQL027 = () => ler('sql/027_consertar_status_revisao.sql');

  it('atende as mesmas tabelas da 025', () => {
    const tabelasDe = (texto) =>
      [...new Set([...texto.matchAll(/'(templates_\w+)'/g)].map((m) => m[1]))].sort();
    expect(tabelasDe(SQL027())).toEqual(tabelasDe(ler('sql/025_status_revisao.sql')));
  });

  // Renomear e não criar do zero: a coluna pode já ter datas, e uma nova
  // vazia ao lado jogaria fora quando cada marcação foi olhada.
  it('renomeia visto_em em vez de criar status_em vazia ao lado', () => {
    expect(SQL027()).toMatch(/rename column visto_em to status_em/i);
  });

  it('garante as quatro colunas que o backend pede', () => {
    const colunas = [...PY_COLUNAS().matchAll(/_COLUNAS = "([^"]+)"/g)][0][1]
      .split(',').filter((c) => c !== 'id');
    for (const coluna of colunas) {
      expect(SQL027(), `coluna ${coluna}`).toMatch(
        new RegExp(`add column if not exists ${coluna}\\b`, 'i'));
    }
  });

  // As versões de 4 valores não têm 'aberto', e é 'aberto' que entra
  // sozinho ao abrir: com a trava delas no lugar, toda abertura falha.
  it('derruba trava de outra versão e deixa a de cinco valores', () => {
    expect(SQL027()).toMatch(/drop constraint/i);
    expect(SQL027()).toContain("'aberto'");
  });

  // O backend grava o email do admin ali.
  it('converte revisto_por de uuid pra text', () => {
    expect(SQL027()).toMatch(/alter column revisto_por type text/i);
  });

  // A palavra aparece nos comentários (eles explicam que a 026 funciona
  // e por isso o problema é coluna). O que não pode é DDL nela.
  it('não altera nenhuma coluna da 026', () => {
    const sql = SQL027().replace(/^\s*--.*$/gm, '');   // fora os comentários
    expect(sql).not.toMatch(/(add|drop|alter|rename)\s+column[^;]*qualidade/i);
    expect(sql).not.toMatch(/qualidade\s+(smallint|timestamptz|text)/i);
  });
});

const PY_COLUNAS = () => ler('admin_status_revisao.py');

// Exceção que escapa do handler derruba a resposta: o navegador não
// recebe status nenhum e a tela diz "não consegui falar com o servidor".
// Isso é falso e manda a pessoa olhar a conexão dela em vez do erro real.
describe('nenhum erro do servidor sai sem resposta', () => {
  for (const arquivo of ['admin_status_revisao.py', 'admin_qualidade.py']) {
    it(`${arquivo} nunca re-lança exceção crua`, () => {
      // `except HTTPException: raise` é o idioma CERTO: repassa uma
      // resposta que já está pronta. Sai da conta antes de procurar os
      // errados.
      const py = ler(arquivo).replace(/except HTTPException:\s*\n\s*raise\s*\n/g, '');
      expect(py).not.toMatch(/^\s*raise\s*$/m);
      expect(py).not.toMatch(/^\s*raise erro\s*$/m);
    });

    it(`${arquivo} traduz erro desconhecido em 500 com o texto do banco`, () => {
      expect(ler(arquivo)).toMatch(/status_code=500/);
    });
  }

  // Marcar as estrelas é o pedido. Marcar "Revisto" junto é conveniência,
  // e conveniência não pode derrubar o pedido: `revisto_por` como uuid
  // numa versão errada da 025 fazia a avaliação inteira se perder.
  it('a qualidade grava mesmo quando as colunas da 025 estão tortas', () => {
    const py = ler('admin_qualidade.py');
    expect(py).toMatch(/except Exception:\s*\n\s*resp = None/);
    expect(py).toMatch(/if resp is None:/);
  });
});
