import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = process.cwd();
const ler = (p) => readFileSync(resolve(raiz, p), 'utf8');

// Estes testes leem os arquivos de configuração em vez de rodar o build.
// É o jeito de travar decisão de segurança que não aparece em nenhuma
// tela: ninguém percebe que o sourcemap voltou, ou que um header caiu,
// olhando o site. O teste percebe.
describe('vite.config.js — source map', () => {
  const fonte = ler('vite.config.js');
  // Sem os comentários: o comentário do próprio arquivo cita o caso ruim
  // ("um sourcemap: true posto por engano"), e a varredura crua acusava
  // justamente a explicação de por que aquilo não pode existir.
  const codigo = fonte.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

  it('não publica source map (publicaria o código original em produção)', () => {
    expect(codigo).toMatch(/sourcemap:\s*false/);
    expect(codigo).not.toMatch(/sourcemap:\s*true/);
  });
});

describe('vercel.json — headers de segurança', () => {
  const vercel = JSON.parse(ler('vercel.json'));
  const regras = vercel.headers.find((r) => r.source === '/(.*)');
  const valor = (chave) => regras.headers.find((h) => h.key === chave)?.value;

  it('tem a regra que vale pra todas as rotas', () => {
    expect(regras).toBeDefined();
  });

  it('HSTS com dois anos e includeSubDomains', () => {
    const hsts = valor('Strict-Transport-Security');
    expect(hsts).toMatch(/max-age=63072000/);
    expect(hsts).toMatch(/includeSubDomains/);
  });

  it('não deixa o site ser posto em iframe', () => {
    expect(valor('X-Frame-Options')).toBe('DENY');
    expect(valor('Content-Security-Policy')).toMatch(/frame-ancestors 'none'/);
  });

  it('nosniff e referrer restrito', () => {
    expect(valor('X-Content-Type-Options')).toBe('nosniff');
    expect(valor('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  // O ponto mais fácil de enfraquecer sem perceber: basta alguém colar uma
  // CSP "que funciona" de um tutorial. 'unsafe-inline' em script-src abre
  // de volta a porta de XSS que a CSP existe pra fechar — e já chegou uma
  // proposta dessas, copiada de um guia genérico.
  it('a CSP NÃO permite script inline nem eval', () => {
    const csp = valor('Content-Security-Policy');
    const scriptSrc = csp.match(/script-src[^;]*/)[0];
    expect(scriptSrc).not.toMatch(/unsafe-inline/);
    expect(scriptSrc).not.toMatch(/unsafe-eval/);
    expect(scriptSrc).toMatch(/'self'/);
  });

  it('a CSP não abre img-src pra https: inteiro', () => {
    const csp = valor('Content-Security-Policy');
    const imgSrc = csp.match(/img-src[^;]*/)[0];
    expect(imgSrc).not.toMatch(/https:(\s|$)/);
  });

  it('object-src e base-uri fechados', () => {
    const csp = valor('Content-Security-Policy');
    expect(csp).toMatch(/object-src 'none'/);
    expect(csp).toMatch(/base-uri 'self'/);
  });
});

describe('.gitignore — segredo não entra no repositório', () => {
  const fonte = ler('../.gitignore');

  it('ignora todo formato de .env', () => {
    for (const padrao of ['.env', '.env.local', '.env.production', '.env.*.local']) {
      expect(fonte).toContain(padrao);
    }
  });

  it('ignora chave privada e certificado', () => {
    expect(fonte).toContain('*.key');
    expect(fonte).toContain('*.pem');
  });

  it('ignora a credencial local da Vercel', () => {
    expect(fonte).toContain('.vercel/');
  });
});

// A chave service_role fura o RLS e dá acesso total ao banco. Se ela
// chegar ao frontend, chega ao navegador de todo mundo — não existe
// "escondido" num bundle. Este teste varre o código-fonte do frontend.
describe('o frontend não contém chave de serviço', () => {
  it('nenhum arquivo em src/ menciona service_role ou sb_secret', async () => {
    const { globSync } = await import('node:fs');
    const arquivos = globSync('src/**/*.{js,jsx,json}', { cwd: raiz });
    const culpados = arquivos.filter((f) => /service_role|SERVICE_ROLE|sb_secret/.test(ler(f))
      // este próprio teste cita os nomes pra poder procurá-los
      && !f.endsWith('configSeguranca.test.js'));
    expect(culpados).toEqual([]);
  });
});
