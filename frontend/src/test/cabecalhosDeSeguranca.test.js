import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// OS DOIS ITENS CRÍTICOS DA AUDITORIA
// ===================================
//
// 1. O SITE não mandava header de segurança nenhum além de HSTS. A API
//    estava blindada; o HTML que o navegador EXECUTA, não. Sem CSP, um XSS
//    futuro teria campo livre — e é justamente o XSS que alcançaria o
//    token no localStorage.
// 2. 401 e 403 saíam como resposta e desapareciam. Não havia como saber se
//    alguém estava tentando entrar no painel.
//
// Estes testes existem porque as duas correções são FÁCEIS de desfazer sem
// ninguém notar: um `unsafe-inline` acrescentado pra "destravar" alguma
// coisa, ou um log removido numa limpeza, não quebram tela nenhuma.
const RAIZ_FRONT = process.cwd();
const RAIZ_BACKEND = resolve(RAIZ_FRONT, '..', 'backend');
const ler = (p) => readFileSync(resolve(RAIZ_FRONT, p), 'utf8');
const lerBackend = (p) => readFileSync(resolve(RAIZ_BACKEND, p), 'utf8');

const vercel = () => JSON.parse(ler('vercel.json'));
const headers = () => {
  const bloco = vercel().headers.find((h) => h.source === '/(.*)');
  return Object.fromEntries(bloco.headers.map((h) => [h.key, h.value]));
};
const csp = () => headers()['Content-Security-Policy'];
const diretiva = (nome) => {
  const achada = csp().split(';').map((d) => d.trim()).find((d) => d.startsWith(`${nome} `) || d === nome);
  return achada || '';
};

describe('headers de segurança do site (Vercel)', () => {
  it('não perdeu os rewrites da SPA ao ganhar headers', () => {
    // sem isto, /admin/templates no F5 dá 404 — a regressão mais fácil aqui
    expect(vercel().rewrites[0].destination).toBe('/index.html');
  });

  it('manda os quatro headers que faltavam', () => {
    const h = headers();
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['Content-Security-Policy']).toBeTruthy();
  });

  it('script-src é só self: sem unsafe-inline e sem unsafe-eval', () => {
    // é A linha que faz a CSP valer alguma coisa contra XSS. Liberar
    // inline aqui permitiria justamente o script que um XSS injeta.
    expect(diretiva('script-src')).toBe("script-src 'self'");
    expect(csp()).not.toMatch(/unsafe-eval/);
  });

  it('fecha clickjacking, <base> e plugin', () => {
    expect(diretiva('frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(diretiva('object-src')).toBe("object-src 'none'");
    expect(diretiva('base-uri')).toBe("base-uri 'self'");
  });

  it('connect-src libera o backend de produção e o Supabase, e nada além', () => {
    const c = diretiva('connect-src');
    // host conferido no bundle publicado em www.tradezen.com.br
    expect(c).toMatch(/https:\/\/tradezen-7brh\.onrender\.com/);
    expect(c).toMatch(/supabase\.co/);
    expect(c).toMatch(/wss:\/\/.*supabase\.co/);   // realtime/auth usam websocket
    expect(c).not.toMatch(/\*\s|'unsafe/);
  });

  it('libera as origens que o código realmente usa, senão o site quebra', () => {
    // cada uma destas está em uso: se a CSP não a listar, o recurso é
    // bloqueado em produção e ninguém vê em dev
    expect(diretiva('style-src')).toMatch(/fonts\.googleapis\.com/);   // @import em appCss.js
    expect(diretiva('font-src')).toMatch(/fonts\.gstatic\.com/);
    expect(diretiva('img-src')).toMatch(/assets\.coingecko\.com/);     // ícones de cripto
    expect(diretiva('img-src')).toMatch(/www\.google\.com/);           // favicons em IconeAtivo
    expect(diretiva('img-src')).toMatch(/data:/);
  });
});

describe('o index.html sobrevive à CSP', () => {
  it('não tem mais script inline', () => {
    // com `script-src self`, script inline NÃO EXECUTA. O vigia da tela
    // branca estava inline: ele morreria calado, e justamente ele é a
    // última rede quando o bundle não carrega.
    expect(ler('index.html')).not.toMatch(/<script>/);
  });

  it('o vigia virou arquivo e é carregado antes do bundle', () => {
    expect(existsSync(resolve(RAIZ_FRONT, 'public/vigia.js'))).toBe(true);
    const html = ler('index.html');
    const posVigia = html.indexOf('/vigia.js');
    const posBundle = html.indexOf('/src/main.jsx');
    expect(posVigia).toBeGreaterThan(-1);
    expect(posVigia).toBeLessThan(posBundle);   // ordem é o ponto
  });

  it('o vigia não usa defer nem async', () => {
    // defer/async o fariam rodar DEPOIS do bundle, que é o contrário do
    // que ele existe pra fazer
    const tag = ler('index.html').match(/<script src="\/vigia\.js"[^>]*>/)[0];
    expect(tag).not.toMatch(/defer|async/);
  });

  it('nenhum atributo de evento inline sobrou (onclick não roda sob CSP)', () => {
    expect(ler('index.html')).not.toMatch(/\son\w+=/);
    expect(ler('public/vigia.js')).not.toMatch(/onclick=/);
    // e o botão de recarregar continua ligado, por addEventListener
    expect(ler('public/vigia.js')).toMatch(/addEventListener\("click"/);
  });
});

describe('log de acesso negado no backend', () => {
  it('existe um módulo de log que escreve no stdout', () => {
    const py = lerBackend('logs.py');
    expect(py).toMatch(/StreamHandler\(sys\.stdout\)/);
    expect(py).toMatch(/seguranca = logging\.getLogger/);
  });

  it('pega o IP real do X-Forwarded-For, não o do proxy', () => {
    // atrás do Render, request.client.host é o proxy: igual pra todo
    // mundo, e por isso inútil pra distinguir uma tentativa de outra
    expect(lerBackend('logs.py')).toMatch(/x-forwarded-for/i);
  });

  it('require_admin registra o 403 de quem não é admin', () => {
    const py = lerBackend('admin_auth.py');
    const bloco = py.slice(py.indexOf('def require_admin'));
    expect(bloco).toMatch(/seguranca\.warning\([^)]*403/);
    expect(bloco).toMatch(/ip_do_pedido\(request\)/);
  });

  it('require_admin registra os 401 também', () => {
    const bloco = lerBackend('admin_auth.py').slice(
      lerBackend('admin_auth.py').indexOf('def require_admin'));
    expect(bloco).toMatch(/401/);
  });

  it('o magic-link registra email fora da allow-list', () => {
    expect(lerBackend('admin_auth.py')).toMatch(/magic-link NEGADO/);
  });

  it('exceção não tratada é logada e o cliente NÃO recebe traceback', () => {
    const py = lerBackend('main.py');
    expect(py).toMatch(/@app\.exception_handler\(Exception\)/);
    expect(py).toMatch(/log_erro\.exception/);
    // a resposta ao cliente é uma frase, não o erro
    const bloco = py.slice(py.indexOf('async def erro_nao_tratado'));
    expect(bloco.slice(0, 600)).toMatch(/Erro interno no servidor/);
    expect(bloco.slice(0, 600)).not.toMatch(/str\(exc\)|\{exc\}/);
  });
});
