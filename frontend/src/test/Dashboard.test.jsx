import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './helpers.jsx';
import { MERCADO_FAKE } from './dadosFake.js';
import { TOP_20 } from '../lib/topAtivos.js';

// No celular a tela inicial mostra o globo e os "Top 20 mais
// acompanhados" — a lista de todos os ativos saiu dali.
const esperados = TOP_20.filter((t) => MERCADO_FAKE.some((a) => a.ticker === t));

async function acharLinhas() {
  // 5s como nos testes do gráfico: a tela inicial monta bastante coisa e,
  // com a suíte inteira rodando junto, 1s (o padrão) estourava de vez em
  // quando — era falha de tempo, não de comportamento.
  return waitFor(() => {
    const linhas = document.querySelectorAll('.top20-linha');
    expect(linhas.length).toBe(esperados.length);
    return [...linhas];
  }, { timeout: 5000 });
}

const simboloDa = (linha) => linha.querySelector('.top20-nome strong').textContent;

describe('Dashboard — Top 20 (mobile)', () => {
  it('busca /mercado na API e lista os ativos da curadoria', async () => {
    renderApp('/mercados', { mobile: true });
    const linhas = await acharLinhas();

    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/mercado$/));
    const simbolos = linhas.map(simboloDa);
    const simbolosEsperados = esperados.map((t) => MERCADO_FAKE.find((a) => a.ticker === t).simbolo);
    expect(simbolos).toEqual(simbolosEsperados);
  });

  it('segue a ordem da curadoria, não a que a API devolveu', async () => {
    renderApp('/mercados', { mobile: true });
    const linhas = await acharLinhas();

    // a API devolve o IBOV primeiro; na curadoria ele vem lá pelo fim
    expect(MERCADO_FAKE[0].simbolo).toBe('IBOV');
    expect(simboloDa(linhas[0])).toBe('PETR4');
  });

  it('cada linha mostra símbolo, nome, preço e variação', async () => {
    renderApp('/mercados', { mobile: true });
    const linhas = await acharLinhas();

    const petr = linhas.find((l) => simboloDa(l) === 'PETR4');
    const linha = within(petr);
    expect(linha.getByText('Petrobras')).toBeInTheDocument();
    expect(linha.getByText(/1\.12%/)).toBeInTheDocument();
  });

  it('a lista vem sem título e sem rodapé', async () => {
    renderApp('/mercados', { mobile: true });
    await acharLinhas();

    expect(screen.queryByText(/mais acompanhados/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Mistura entre/)).not.toBeInTheDocument();
  });

  it('tocar num ativo abre a página do gráfico dele', async () => {
    const user = userEvent.setup();
    renderApp('/mercados', { mobile: true });
    const linhas = await acharLinhas();

    const petr = linhas.find((l) => simboloDa(l) === 'PETR4');
    await user.click(petr);

    await waitFor(() => expect(window.location.pathname).toBe('/ativo/PETR4.SA'));
  });

  it('mostra aviso quando a API falha', async () => {
    fetch.mockImplementation(() => Promise.reject(new Error('offline')));
    renderApp('/mercados', { mobile: true });

    expect(
      await screen.findByText(/Não foi possível carregar as cotações agora/)
    ).toBeInTheDocument();
  });
});
