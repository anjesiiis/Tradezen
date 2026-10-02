import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaCriptomoedas from '../pages/Criptomoedas.jsx';
import { definirTela } from './helpers.jsx';

const cripto = (ticker, nome, simbolo, preco, pct) => ({
  ticker, nome, simbolo, mercado: 'CRIPTO', preco,
  variacao_pct: pct, alta: pct >= 0, serie: [1, 2, 3],
});

// 9 criptos: o suficiente pra a lista do celular abrir com 6 e carregar o
// resto depois
const CRIPTOS = [
  cripto('BTC-USD', 'Bitcoin', 'BTC', 76242, -2.46),
  cripto('ETH-USD', 'Ethereum', 'ETH', 2705, 0.82),
  cripto('BNB-USD', 'Binance Coin', 'BNB', 770, 0.35),
  cripto('XRP-USD', 'Ripple', 'XRP', 1.49, 0.4),
  cripto('SOL-USD', 'Solana', 'SOL', 118, 0.7),
  cripto('DOGE-USD', 'Dogecoin', 'DOGE', 0.09, -0.53),
  cripto('AVAX-USD', 'Avalanche', 'AVAX', 10.9, 0.01),
  cripto('ADA-USD', 'Cardano', 'ADA', 0.24, -0.32),
  cripto('LTC-USD', 'Litecoin', 'LTC', 88, 1.1),
];

function montar({ mobile = true, mercado = CRIPTOS } = {}) {
  definirTela(mobile ? 390 : 1440);
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
  return render(<PaginaCriptomoedas tema="dark" mercado={mercado} abrirAtivo={vi.fn()} />);
}

const linhas = () => [...document.querySelectorAll('.cripto-linha')];

describe('Criptomoedas no celular', () => {
  it('abre com as seis primeiras, não com a lista inteira', async () => {
    montar();

    await waitFor(() => expect(linhas()).toHaveLength(6));
    expect(within(linhas()[0]).getByText('BTC')).toBeInTheDocument();
  });

  it('não busca a visão geral do mercado (bloco que nem aparece aqui)', () => {
    montar();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('não monta o gráfico de capitalização total', () => {
    montar();

    expect(screen.queryByText('Capitalização total de mercado')).not.toBeInTheDocument();
  });

  it('cada linha traz símbolo, nome, preço e variação', async () => {
    montar();
    await waitFor(() => expect(linhas()).toHaveLength(6));

    const eth = linhas().find((l) => within(l).queryByText('ETH'));
    expect(within(eth).getByText('Ethereum')).toBeInTheDocument();
    expect(within(eth).getByText(/0\.82%/)).toBeInTheDocument();
  });

  it('tocar numa linha abre o ativo', async () => {
    const user = userEvent.setup();
    definirTela(390);
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    const abrirAtivo = vi.fn();
    render(<PaginaCriptomoedas tema="dark" mercado={CRIPTOS} abrirAtivo={abrirAtivo} />);
    await waitFor(() => expect(linhas()).toHaveLength(6));

    await user.click(linhas()[0]);

    expect(abrirAtivo).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'BTC-USD' }));
  });
});

describe('Criptomoedas no desktop', () => {
  it('cripto que não veio na API não deixa card vazio — diz o que houve', async () => {
    // sem o Bitcoin, que é justamente o que o /mercado às vezes não traz
    montar({ mobile: false, mercado: CRIPTOS.filter((c) => c.ticker !== 'BTC-USD') });

    expect(await screen.findByText('Cotação indisponível agora')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
  });

  it('enquanto nada chegou, mostra esqueleto em vez do aviso', () => {
    montar({ mobile: false, mercado: [] });

    expect(screen.queryByText('Cotação indisponível agora')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.idx-skel').length).toBeGreaterThan(0);
  });
});
