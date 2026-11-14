import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NIVEIS, QUALIDADE_MAXIMA, estrelasCheias } from '../admin/qualidade.js';

// Lê os arquivos do backend de propósito: é o único jeito de o teste do
// frontend notar que o backend mudou. path.resolve e nao new URL(...,
// import.meta.url) — o Vite enxerga a segunda forma como import de asset
// e recusa caminho fora da raiz do projeto.
const RAIZ_BACKEND = resolve(process.cwd(), '..', 'backend');
const ler = (caminho) => readFileSync(resolve(RAIZ_BACKEND, caminho), 'utf8');

const SQL = () => ler('sql/026_qualidade_da_marcacao.sql');
const PY = () => ler('admin_qualidade.py');
const SQL029 = () => ler('sql/029_meia_estrela.sql');
// Só o SQL que EXECUTA. Sem isto, um indexOf de ordem casa com a menção
// dentro do comentário de cabeçalho, que vem antes de tudo — foi o que
// me enganou ao escrever estes testes.
const SQL029_CODIGO = () => SQL029().replace(/^\s*--.*$/gm, '');

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

  // A 026 nasceu com 0..4; a 029 é que abre pra 0..8. A 026 fica como
  // está — reescrever migration que já rodou no banco de alguém é mentir
  // sobre o que foi aplicado.
  it('a 026 continua sendo a escala original 0 a 4', () => {
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
  it('os rótulos dos nove passos são idênticos nos dois lados', () => {
    const noPy = [...PY().matchAll(/ROTULOS = \{([^}]+)\}/g)][0][1];
    for (const n of NIVEIS) {
      expect(noPy, `${n.valor} = ${n.rotulo}`).toContain(`${n.valor}: "${n.rotulo}"`);
    }
  });

  // Os cinco valores nomeados são os MESMOS de antes da meia estrela, só
  // nos índices pares. Se mudassem, as avaliações já feitas passariam a
  // valer outro alvo de treino sem ninguém ter reavaliado nada.
  it('o alvo do ML preserva os cinco valores originais nos pares', () => {
    const score = [...PY().matchAll(/_SCORE = \{([^}]+)\}/g)][0][1];
    for (const [nivel, valor] of [[0, '0.0'], [2, '0.3'], [4, '0.6'], [6, '0.8'], [8, '1.0']]) {
      expect(score, `nível ${nivel}`).toContain(`${nivel}: ${valor}`);
    }
  });

  it('o alvo do ML tem um valor por passo e nunca desce', () => {
    const score = [...PY().matchAll(/_SCORE = \{([^}]+)\}/g)][0][1];
    const valores = NIVEIS.map((n) => {
      const achado = new RegExp(`\\b${n.valor}: ([0-9.]+)`).exec(score);
      expect(achado, `falta o nível ${n.valor}`).not.toBeNull();
      return Number(achado[1]);
    });
    // NIVEIS vem do melhor pro pior, então o alvo tem que cair sem empatar
    for (let i = 1; i < valores.length; i++) {
      expect(valores[i], `nível ${NIVEIS[i].valor}`).toBeLessThan(valores[i - 1]);
    }
    expect(Math.max(...valores)).toBe(1);
    expect(Math.min(...valores)).toBe(0);
  });

  // Teto diferente aqui e lá daria 422 na tela pra uma nota que o banco
  // aceita, ou 500 pra uma que ele recusa.
  it('o teto da escala é o mesmo na tela, no backend e no banco', () => {
    expect(QUALIDADE_MAXIMA).toBe(8);
    expect(PY()).toMatch(/QUALIDADE_MAXIMA = 8/);
    expect(PY()).toMatch(/le=QUALIDADE_MAXIMA/);
    expect(SQL029()).toMatch(/qualidade between 0 and 8/i);
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


// A MIGRATION 029 — MEIA ESTRELA
// ==============================
//
// Ela REESCREVE as avaliações que já existem (qualidade * 2). É a única
// migration do projeto que mexe em dado humano já gravado, então o que
// precisa ser verdade nela está travado aqui.
describe('a 029 dobra a escala sem perder avaliação', () => {
  it('cobre as mesmas 21 tabelas da 026', () => {
    const tabelasDe = (texto) =>
      [...new Set([...texto.matchAll(/'(templates_\w+)'/g)].map((m) => m[1]))].sort();
    expect(tabelasDe(SQL029())).toEqual(tabelasDe(SQL()));
    expect(tabelasDe(SQL029())).toHaveLength(21);
  });

  it('converte o que existe em vez de zerar ou inventar nota', () => {
    expect(SQL029()).toMatch(/set qualidade = qualidade \* 2/i);
    expect(SQL029()).toMatch(/where qualidade is not null/i);
    // nenhum update que grave número fixo em cima do julgamento de alguém
    expect(SQL029()).not.toMatch(/set\s+qualidade\s*=\s*\d+\s/i);
  });

  // A ORDEM: se o update viesse antes, 4*2=8 bateria na trava velha
  // (0..4) e a migration morreria no meio, com parte das tabelas
  // convertidas e parte não.
  it('abre a trava para 0..8 ANTES de dobrar os valores', () => {
    const sql = SQL029_CODIGO();
    expect(sql.indexOf('between 0 and 8')).toBeLessThan(sql.indexOf('qualidade * 2'));
  });

  // Rodar duas vezes não pode dobrar de novo (4 -> 8 -> 16).
  it('é idempotente, com marcador que sobrevive à sessão', () => {
    const sql = SQL029_CODIGO();
    expect(sql).toMatch(/col_description/);
    expect(sql).toMatch(/comment on column/i);
    expect(sql).toMatch(/escala 0-8/);
    // o marcador é lido ANTES de converter
    expect(sql.indexOf('col_description')).toBeLessThan(sql.indexOf('qualidade * 2'));
  });

  it('não roda em tabela que ainda não tem a coluna', () => {
    expect(SQL029()).toMatch(/column_name = 'qualidade'/);
    expect(SQL029()).toMatch(/to_regclass/);
  });

  it('recarrega o schema do PostgREST no fim', () => {
    expect(SQL029()).toMatch(/notify pgrst, 'reload schema'/);
  });

  // TUDO OU NADA. Converter 21 tabelas sem transação é o pior caso
  // possível deste arquivo: um erro no meio deixa parte das tabelas em
  // 0..8 e parte em 0..4, e o marcador de idempotência faz a segunda
  // tentativa PULAR exatamente as que já tinham dado certo — então não
  // existe "rodar de novo pra terminar".
  it('converte tudo dentro de uma transação', () => {
    const sql = SQL029_CODIGO();
    expect(sql).toMatch(/^\s*begin;/im);
    expect(sql).toMatch(/^\s*commit;/im);
    // A ordem é begin → dobra → notify → commit.
    expect(sql.indexOf('begin;')).toBeLessThan(sql.indexOf('qualidade * 2'));
    expect(sql.indexOf('qualidade * 2')).toBeLessThan(sql.indexOf('notify pgrst'));
    expect(sql.indexOf('notify pgrst')).toBeLessThan(sql.indexOf('commit;'));
  });
});

describe('a conta das estrelas é a mesma dos dois lados', () => {
  it('valor/2+1 vai de 1 a 5 de meia em meia, sem pular nem repetir', () => {
    const estrelas = NIVEIS.map((n) => estrelasCheias(n.valor));
    expect(estrelas).toEqual([5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1]);
    expect(new Set(estrelas).size).toBe(9);
  });

  it('o comentário da coluna no banco descreve esta mesma escala', () => {
    expect(SQL029()).toMatch(/0=Falha\(1 estrela\)/);
    expect(SQL029()).toMatch(/8=Otimo\(5 estrelas\)/);
  });
});


// O ERRO CRU DO POSTGRES NÃO DIZ O QUE FAZER
// ==========================================
//
// Com a tela na escala nova (0..8) e o banco ainda na antiga (0..4), toda
// nota acima de Média volta como `violates check constraint
// "..._qualidade_ck"`, código 23514. Foi exatamente isso que chegou na
// tela do dono do projeto: um erro de banco, sem providência nenhuma.
//
// 23514 não pode ser culpa do valor: o pydantic já barra fora de 0..8 com
// 422 antes de chegar ao banco. Se a trava reclamou, a trava está velha.
describe('o backend traduz a trava velha em providência', () => {
  it('reconhece a violação de check pelo código e pelo nome da trava', () => {
    const py = PY();
    expect(py).toMatch(/_trava_da_escala/);
    expect(py).toMatch(/23514/);
    expect(py).toMatch(/_qualidade_ck/);
  });

  it('manda rodar a 029, e não a 026', () => {
    const trecho = PY().slice(PY().indexOf('_trava_da_escala'));
    const ate = trecho.slice(0, trecho.indexOf('_falta_coluna'));
    expect(ate).toMatch(/029_meia_estrela\.sql/);
    expect(ate).not.toMatch(/026_qualidade/);
  });

  // A trava é testada ANTES da coluna faltando: a coluna existe nesse
  // caso, então o teste de coluna não pegaria, e o erro cairia no 500
  // genérico com o texto do Postgres.
  it('testa a trava antes de qualquer outra causa', () => {
    const py = PY();
    expect(py.indexOf('if _trava_da_escala(erro)'))
      .toBeLessThan(py.indexOf('if _falta_coluna(erro, "qualidade")'));
  });

  it('diz o que fazer se a migration já rodou mas o cache está velho', () => {
    const trecho = PY().slice(PY().indexOf('_trava_da_escala'));
    expect(trecho.slice(0, 2000)).toMatch(/reload schema/);
  });

  // Violação de UNIQUE também é 235xx. Confundir as duas mandaria rodar
  // uma migration que não tem nada a ver com o problema.
  it('não confunde check com outras violações de constraint', () => {
    const py = PY();
    expect(py).not.toMatch(/23505/);
    expect(py).toMatch(/check constraint/);
  });
});
