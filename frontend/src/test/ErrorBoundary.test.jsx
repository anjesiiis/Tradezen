import { fireEvent, render, screen } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

function Quebra() {
  throw new Error('preço indefinido no candle 42');
}

function QuebraPorChunk() {
  throw new TypeError('Failed to fetch dynamically imported module: /assets/Admin-x1.js');
}

// Cada navegador descreve a mesma falha com outras palavras. A lista
// anterior não cobria as de MIME, e aí a tela de erro aparecia no lugar
// da recuperação — foi o que aconteceu no "Acesse agora" em produção.
const MENSAGENS_DE_CHUNK = [
  'Failed to fetch dynamically imported module: /assets/Cadastro-a1.js',
  "'text/html' is not a valid JavaScript MIME type.",
  'Expected a JavaScript module script but the server responded with a MIME type of "text/html".',
  'Importing a module script failed.',
  'error loading dynamically imported module',
  'ChunkLoadError: Loading chunk 12 failed.',
];

describe('ErrorBoundary', () => {
  // o React escreve o erro no console mesmo quando o boundary trata; sem
  // silenciar, a saída do teste fica ilegível
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('sem erro, não aparece — só mostra o conteúdo', () => {
    render(<ErrorBoundary><p>o gráfico</p></ErrorBoundary>);

    expect(screen.getByText('o gráfico')).toBeInTheDocument();
    expect(screen.queryByText(/Algo quebrou/)).not.toBeInTheDocument();
  });

  // é o ponto da coisa: erro no render não pode mais virar tela branca
  it('com erro, mostra a mensagem em vez de apagar a tela', () => {
    render(<ErrorBoundary><Quebra/></ErrorBoundary>);

    expect(screen.getByText(/Algo quebrou ao abrir esta tela/)).toBeInTheDocument();
    expect(screen.getByText('preço indefinido no candle 42')).toBeInTheDocument();
  });

  it('oferece recarregar, copiar o erro e voltar pro início', () => {
    render(<ErrorBoundary><Quebra/></ErrorBoundary>);

    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar o erro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir pra tela inicial' })).toHaveAttribute('href', '/');
  });

  // num celular não há console: copiar é o único jeito de mandar o erro.
  // fireEvent e não userEvent aqui: o userEvent.setup() instala o próprio
  // stub de clipboard e sobrescreveria este mock.
  it('copiar põe a mensagem na área de transferência', () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ErrorBoundary><Quebra/></ErrorBoundary>);

    fireEvent.click(screen.getByRole('button', { name: 'Copiar o erro' }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('preço indefinido no candle 42'));
  });
});

// Deploy novo apaga os arquivos com hash da versão anterior. Quem tem o
// index.html velho no cache pede uma peça que não existe mais: o import
// falha, nada renderiza, e o usuário vê branco sem ter mexido em nada.
// Acusar erro aqui seria inútil — o conserto é buscar a versão nova.
describe('ErrorBoundary — versão velha no cache', () => {
  let replace;

  // O módulo guarda uma marca em memória pra não recarregar duas vezes na
  // mesma carga da página. Entre testes isso vazaria, então cada um
  // importa o componente do zero.
  async function montarComChunkQuebrado({ jaTentouAntes = false, erroComum = false } = {}) {
    vi.resetModules();
    sessionStorage.clear();
    if (jaTentouAntes) sessionStorage.setItem('tradezen_recarregou_por_chunk', '1');
    const { default: Boundary } = await import('../components/ErrorBoundary.jsx');
    const Filho = erroComum ? Quebra : QuebraPorChunk;
    return render(<Boundary><Filho/></Boundary>);
  }

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    replace = vi.fn();
    delete window.location;
    window.location = { href: 'https://tradezen.com.br/ativo/PETR4.SA', replace };
  });
  afterEach(() => vi.restoreAllMocks());

  it('chunk que não baixou faz recarregar furando o cache, sem tela de erro', async () => {
    await montarComChunkQuebrado();

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace.mock.calls[0][0]).toMatch(/\?v=/);
    expect(screen.queryByText(/Algo quebrou/)).not.toBeInTheDocument();
    expect(screen.getByText('Atualizando o site…')).toBeInTheDocument();
  });

  it('não recarrega duas vezes — se já tentou, mostra o erro', async () => {
    await montarComChunkQuebrado({ jaTentouAntes: true });

    expect(replace).not.toHaveBeenCalled();
    // Texto PRÓPRIO desse caso: a recarga automática já rodou e não
    // resolveu, então "recarregar costuma resolver" seria mentira.
    expect(screen.getByText(/Saiu uma atualização do TradeZen/)).toBeInTheDocument();
    expect(screen.queryByText('Recarregar')).not.toBeInTheDocument();
    expect(screen.getByText('Limpar e recarregar')).toBeInTheDocument();
  });

  // ERRO COMUM (nao de chunk) com a marca posta: a marca ficou de uma
  // recarga anterior e nao diz nada sobre ESTE erro. O texto tem que ser
  // o generico, e o botao, o de recarregar.
  it('erro comum não vira "saiu uma atualização" só porque houve recarga antes', async () => {
    sessionStorage.setItem('tradezen_recarregou_por_chunk', '1');
    vi.resetModules();
    const { default: Boundary } = await import('../components/ErrorBoundary.jsx');
    render(<Boundary><Quebra/></Boundary>);

    expect(screen.getByText(/Algo quebrou ao abrir esta tela/)).toBeInTheDocument();
    expect(screen.getByText('Recarregar')).toBeInTheDocument();
  });

  // A MARCA TEM QUE SER ESQUECIDA.
  // Ela sobrevivia a sessao inteira: quem deixa o TradeZen aberto o dia
  // todo (o nosso usuario) pegava o SEGUNDO deploy sem recuperacao
  // automatica, direto na tela de erro.
  it('depois de alguns segundos em pé, esquece a recarga e volta a poder se recuperar', async () => {
    vi.useFakeTimers();
    try {
      sessionStorage.setItem('tradezen_recarregou_por_chunk', '1');
      vi.resetModules();
      const { default: Boundary } = await import('../components/ErrorBoundary.jsx');
      render(<Boundary><p>app de pé</p></Boundary>);

      expect(sessionStorage.getItem('tradezen_recarregou_por_chunk')).toBe('1');
      vi.advanceTimersByTime(4000);
      expect(sessionStorage.getItem('tradezen_recarregou_por_chunk')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('com a tela de erro na frente, a marca NÃO é esquecida — senão volta o laço', async () => {
    vi.useFakeTimers();
    try {
      await montarComChunkQuebrado({ jaTentouAntes: true });
      vi.advanceTimersByTime(10000);
      expect(sessionStorage.getItem('tradezen_recarregou_por_chunk')).toBe('1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('"Limpar e recarregar" apaga o storage e espera o Cache API antes de ir', async () => {
    const apagados = [];
    let resolverKeys;
    globalThis.caches = {
      keys: () => new Promise((r) => { resolverKeys = r; }),
      delete: (n) => { apagados.push(n); return Promise.resolve(true); },
    };
    localStorage.setItem('tradezen-tema', 'light');

    await montarComChunkQuebrado({ jaTentouAntes: true });
    fireEvent.click(screen.getByText('Limpar e recarregar'));

    expect(localStorage.getItem('tradezen-tema')).toBeNull();
    // Nao recarregou ainda: recarregar no meio da limpeza deixaria metade
    // do cache velho de pe e o erro voltaria.
    expect(replace).not.toHaveBeenCalled();

    resolverKeys(['tradezen-v1', 'tradezen-v2']);
    await new Promise((r) => setTimeout(r, 0));

    expect(apagados).toEqual(['tradezen-v1', 'tradezen-v2']);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace.mock.calls[0][0]).toMatch(/\?v=/);
    delete globalThis.caches;
  });

  it.each(MENSAGENS_DE_CHUNK)('reconhece: %s', async (mensagem) => {
    function Quebra404() { throw new TypeError(mensagem); }
    vi.resetModules();
    sessionStorage.clear();
    const { default: Boundary } = await import('../components/ErrorBoundary.jsx');

    render(<Boundary><Quebra404/></Boundary>);

    expect(replace, mensagem).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Atualizando o site…')).toBeInTheDocument();
  });

  it('erro comum de render não vira recarga', async () => {
    await montarComChunkQuebrado({ erroComum: true });

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText(/Algo quebrou ao abrir esta tela/)).toBeInTheDocument();
  });
});
