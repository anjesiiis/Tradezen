import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ARMAZENAMENTO_LOCAL, DADOS_COLETADOS, DIREITOS, EMAIL_PRIVACIDADE,
  NAO_FAZEMOS, RETENCAO, SEGURANCA, TRANSFERENCIA_INTERNACIONAL,
} from '../lib/politicaPrivacidade.js';
import Privacidade from '../pages/Privacidade.jsx';
import BannerPrivacidade from '../components/BannerPrivacidade.jsx';

const RAIZ_FRONT = process.cwd();
const RAIZ_BACKEND = resolve(RAIZ_FRONT, '..', 'backend');
const ler = (p) => readFileSync(resolve(RAIZ_FRONT, p), 'utf8');
const lerBackend = (p) => readFileSync(resolve(RAIZ_BACKEND, p), 'utf8');

// LGPD — O DOCUMENTO E OS DIREITOS
// ===============================
//
// Política de Privacidade é documento legal: o risco não é a tela quebrar,
// é o texto perder uma declaração obrigatória numa edição e ninguém notar.
// Por isso o texto vive em lib/politicaPrivacidade.js como dado, e estes
// testes afirmam o CONTEÚDO, não o layout.

describe('o documento declara o que a LGPD exige', () => {
  it('cada dado coletado tem finalidade E base legal', () => {
    expect(DADOS_COLETADOS.length).toBeGreaterThanOrEqual(5);
    for (const d of DADOS_COLETADOS) {
      expect(d.dado.length).toBeGreaterThan(2);
      expect(d.finalidade.length).toBeGreaterThan(10);
      // sem base legal declarada, a finalidade sozinha não cumpre o art. 7º
      expect(d.base).toMatch(/art\. 7º/);
    }
  });

  it('as quatro bases legais do projeto estão declaradas', () => {
    const todas = DADOS_COLETADOS.map((d) => d.base).join(' ');
    expect(todas).toMatch(/Execução de contrato \(art\. 7º, V\)/);
    expect(todas).toMatch(/Legítimo interesse \(art\. 7º, IX\)/);
    expect(todas).toMatch(/Consentimento \(art\. 7º, I\)/);
  });

  it('marketing é consentimento, nunca legítimo interesse', () => {
    // deduzir marketing de legítimo interesse é o erro clássico: é o que
    // transforma divulgação em infração
    const mkt = DADOS_COLETADOS.find((d) => /novidades e ofertas/i.test(d.dado));
    expect(mkt).toBeTruthy();
    expect(mkt.base).toMatch(/Consentimento/);
    expect(mkt.base).not.toMatch(/Legítimo interesse/);
  });

  it('os direitos do art. 18 estão listados com o caminho de cada um', () => {
    const texto = DIREITOS.map((d) => `${d.direito} ${d.como}`).join(' ').toLowerCase();
    for (const esperado of ['acesso', 'correção', 'exclusão', 'revogação', 'portabilidade']) {
      expect(texto).toContain(esperado);
    }
    for (const d of DIREITOS) expect(d.como.length).toBeGreaterThan(10);
  });

  it('declara transferência internacional', () => {
    // o provedor afirma que pode guardar fora do Brasil; omitir isso seria
    // omitir o que o art. 33 manda informar
    expect(TRANSFERENCIA_INTERNACIONAL).toMatch(/transferência internacional/i);
    expect(TRANSFERENCIA_INTERNACIONAL).toMatch(/Supabase/);
  });

  it('declara retenção, inclusive o que acontece ao excluir a conta', () => {
    const texto = RETENCAO.map((r) => `${r.quando} ${r.o_que}`).join(' ');
    expect(texto).toMatch(/exclui a conta/i);
    expect(texto).toMatch(/30 dias/);
  });

  it('tem canal de contato', () => {
    expect(EMAIL_PRIVACIDADE).toMatch(/^[^@\s]+@[^@\s]+\.[a-z.]+$/);
  });

  it('não promete prazo de log que não controlamos', () => {
    // a retenção de log é do provedor de hospedagem. Prometer "90 dias"
    // seria declarar um prazo que não está na nossa mão.
    const log = RETENCAO.find((r) => /registros técnicos/i.test(r.quando));
    expect(log).toBeTruthy();
    expect(log.o_que).toMatch(/provedor/i);
    expect(log.o_que).not.toMatch(/90 dias/);
  });

  it('não afirma cookie de sessão, porque a sessão é localStorage', () => {
    expect(ARMAZENAMENTO_LOCAL).toMatch(/localStorage/);
    expect(ARMAZENAMENTO_LOCAL).toMatch(/não usamos cookies de rastreamento/i);
  });

  it('as promessas de "não fazemos" cobrem venda e rastreamento', () => {
    const texto = NAO_FAZEMOS.join(' ').toLowerCase();
    expect(texto).toContain('não vendemos');
    expect(texto).toContain('rastreamento comportamental');
  });

  it('a seção de segurança cita RLS e criptografia', () => {
    const texto = SEGURANCA.join(' ');
    expect(texto).toMatch(/Row Level Security/);
    expect(texto).toMatch(/AES-256/);
    expect(texto).toMatch(/TLS/);
  });
});

describe('a página de privacidade', () => {
  it('rende as seções que a lei pede', () => {
    render(<Privacidade />);
    expect(screen.getByRole('heading', { level: 1, name: /Política de Privacidade/ })).toBeTruthy();
    for (const titulo of [/O que coletamos/, /O que não fazemos/, /Como protegemos/,
                          /Por quanto tempo/, /Seus direitos/, /Contato/]) {
      expect(screen.getByRole('heading', { level: 2, name: titulo })).toBeTruthy();
    }
  });

  it('o contato é um mailto clicável', () => {
    render(<Privacidade />);
    const link = screen.getByRole('link', { name: EMAIL_PRIVACIDADE });
    expect(link.getAttribute('href')).toBe(`mailto:${EMAIL_PRIVACIDADE}`);
  });

  it('mostra todos os dados coletados, sem esconder nenhum', () => {
    render(<Privacidade />);
    for (const d of DADOS_COLETADOS) expect(screen.getByText(d.dado)).toBeTruthy();
  });

  it('a rota /privacidade é pública (não está atrás de RequireAuth)', () => {
    const app = ler('src/App.jsx');
    const linha = app.split('\n').find((l) => l.includes('"/privacidade"'));
    expect(linha).toBeTruthy();
    expect(linha).not.toMatch(/RequireAuth/);
  });

  it('tem link no rodapé da landing', () => {
    expect(ler('src/pages/Landing.jsx')).toMatch(/href="\/privacidade"/);
  });
});

describe('aviso de privacidade (banner)', () => {
  beforeEach(() => localStorage.clear());

  it('aparece na primeira visita e diz que não rastreamos', () => {
    render(<BannerPrivacidade />);
    expect(screen.getByText(/Não rastreamos o seu/i)).toBeTruthy();
  });

  it('"Entendi" fecha e não volta na visita seguinte', async () => {
    const { unmount } = render(<BannerPrivacidade />);
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Entendi' })).toBeNull());
    unmount();

    render(<BannerPrivacidade />);
    expect(screen.queryByRole('button', { name: 'Entendi' })).toBeNull();
  });

  it('tem "Saiba mais" apontando pra política', () => {
    render(<BannerPrivacidade />);
    expect(screen.getByRole('link', { name: 'Saiba mais' }).getAttribute('href'))
      .toBe('/privacidade');
  });

  it('localStorage bloqueado não derruba a página', () => {
    // aba privada, ou dados do site bloqueados: o acesso ESTOURA. Um aviso
    // de privacidade quebrando o site seria irônico demais.
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => render(<BannerPrivacidade />)).not.toThrow();
    spy.mockRestore();
  });
});

describe('consentimento de marketing', () => {
  it('a caixinha do cadastro nasce DESMARCADA', () => {
    // consentimento pré-marcado não é consentimento (art. 7º, I)
    const jsx = ler('src/auth/Cadastro.jsx');
    expect(jsx).toMatch(/useState\(false\)/);
    const bloco = jsx.slice(jsx.indexOf('auth-check'), jsx.indexOf('auth-check') + 400);
    expect(bloco).toMatch(/type="checkbox"/);
    expect(bloco).not.toMatch(/defaultChecked|checked=\{true\}/);
  });

  it('o cadastro manda o consentimento pro banco', () => {
    expect(ler('src/auth/Cadastro.jsx')).toMatch(/marketing_whatsapp: marketing/);
  });

  it('o cadastro não bloqueia quem não aceita marketing', () => {
    // exigir a caixa pra criar conta tiraria a liberdade do consentimento
    const jsx = ler('src/auth/Cadastro.jsx');
    const botao = jsx.slice(jsx.indexOf('type="submit"'));
    expect(botao.slice(0, 200)).not.toMatch(/marketing/);
  });

  it('dá pra revogar em Configurações, como a política promete', () => {
    const jsx = ler('src/pages/Configuracoes.jsx');
    expect(jsx).toMatch(/marketing_whatsapp: marketing/);
    expect(jsx).toMatch(/cfg-check/);
    const promessa = DIREITOS.find((d) => /Revogação/.test(d.direito));
    expect(promessa.como).toMatch(/Configurações/);
  });

  it('a migration cria a coluna com default false e guarda a data', () => {
    const sql = lerBackend('sql/028_consentimento_marketing.sql');
    expect(sql).toMatch(/marketing_whatsapp boolean not null default false/);
    expect(sql).toMatch(/marketing_em timestamptz/);
    expect(sql).toMatch(/criar_perfil_no_cadastro/);
  });
});

describe('exclusão da conta (art. 18, VI)', () => {
  it('a rota existe e o id vem SÓ do token', () => {
    const py = lerBackend('conta.py');
    expect(py).toMatch(/@router\.delete\("\/conta"\)/);
    expect(py).toMatch(/usuario_id: str = Depends\(require_user\)/);
    // se o id viesse do pedido, seria o IDOR mais destrutivo possível
    expect(py).not.toMatch(/usuario_id: str(?!\s*=\s*Depends)/);
  });

  it('apaga pelo Auth, pra o cascade levar tudo junto', () => {
    expect(lerBackend('conta.py')).toMatch(/auth\.admin\.delete_user\(usuario_id\)/);
  });

  it('a rota está registrada no app', () => {
    expect(lerBackend('main.py')).toMatch(/include_router\(conta_router\)/);
  });

  it('registra o pedido no log antes de apagar', () => {
    // depois de apagar não haveria mais de quem falar no log
    const py = lerBackend('conta.py');
    const pedida = py.indexOf('exclusao de conta PEDIDA');
    const apaga = py.indexOf('delete_user');
    expect(pedida).toBeGreaterThan(-1);
    expect(pedida).toBeLessThan(apaga);
  });

  it('o cascade cobre desenhos, perfil e preferências', () => {
    const tabelas = ['graficos_usuario', 'profiles', 'sessao_telas', 'alertas'];
    const sqls = ['020_graficos_do_usuario.sql', '017_profiles_e_planos.sql',
                  '022_sessao_telas.sql', '005_alertas.sql']
      .map((f) => lerBackend(`sql/${f}`)).join('\n');
    for (const t of tabelas) expect(sqls).toMatch(new RegExp(t));
    expect(sqls).toMatch(/on delete cascade/);
  });

  it('a confirmação exige a palavra EXCLUIR digitada', () => {
    // um "tem certeza?" é clicado no automático; escrever exige ler
    const jsx = ler('src/pages/Configuracoes.jsx');
    expect(jsx).toMatch(/toUpperCase\(\) === "EXCLUIR"/);
  });

  it('o cliente passa pelo backend, nunca apaga direto pelo Supabase', () => {
    // apagar usuário do Auth exige a chave de serviço, que jamais pode
    // estar no navegador
    const js = ler('src/lib/conta.js');
    expect(js).toMatch(/method: "DELETE"/);
    expect(js).toMatch(/\/eu\/conta/);
    expect(js).not.toMatch(/auth\.admin/);
  });

  it('encerra a sessão local depois de excluir', () => {
    expect(ler('src/lib/conta.js')).toMatch(/signOut/);
  });
});
