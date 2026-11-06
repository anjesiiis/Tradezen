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
