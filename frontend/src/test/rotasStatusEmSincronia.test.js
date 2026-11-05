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
});
