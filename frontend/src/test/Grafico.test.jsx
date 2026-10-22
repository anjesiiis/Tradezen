import { screen, waitFor, within } from '@testing-library/react';
import { createChart } from 'lightweight-charts';
import { renderApp } from './helpers.jsx';

// timeout maior: com a suíte inteira em paralelo, o chunk do gráfico
// (lazy) às vezes passa de 1s, o padrão do waitFor.
describe('Gráfico do ativo', () => {
  it('renderiza a página do ativo sem crash e cria o gráfico (desktop)', async () => {
    renderApp('/ativo/PETR4.SA');

    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });
    expect(document.querySelector('.analysis-wrap')).not.toBeNull();
    expect(screen.queryByText('Página não encontrada')).not.toBeInTheDocument();
  });

  it('busca os candles do ativo certo na API', async () => {
    renderApp('/ativo/PETR4.SA');

    await waitFor(
      () => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/ativo/PETR4.SA?')),
      { timeout: 5000 }
    );
  });

  // A régua fica na barra de cima: arma como ferramenta, mas o que ela
  // desenha não fica salvo. Esconder, travar e limpar foram retirados da
  // interface por pedido do dono.
  it('a régua fica na barra de cima, e as outras ações saíram', async () => {
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });

    expect(screen.getByTitle('Régua — medir variação')).toBeInTheDocument();
    for (const titulo of ['Esconder desenhos', 'Travar desenhos', 'Limpar desenhos']) {
      expect(screen.queryByTitle(titulo)).not.toBeInTheDocument();
    }
  });

  it('a barra lateral tem só as seis ferramentas de desenho', async () => {
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });

    await waitFor(() => expect(document.querySelectorAll('.chart-tool')).toHaveLength(6));
    expect(screen.queryByLabelText('Cursor')).not.toBeInTheDocument();
  });

  // A busca desce pro gráfico (é busca de ativo, fica colada no ativo); o
  // tema fica no header, do lado do login. O risco é tirar de um lugar e
  // esquecer de pôr no outro, deixando a função sem acesso nenhum.
  it('a busca fica na toolbar e o tema no header', async () => {
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });

    const toolbar = document.querySelector('.atb');
    const header = document.querySelector('nav.nav');

    expect(within(toolbar).getByTitle('Buscar ativo')).toBeInTheDocument();
    expect(within(toolbar).queryByTitle(/Mudar pro tema/)).not.toBeInTheDocument();
    expect(within(header).queryByTitle('Buscar')).not.toBeInTheDocument();
    expect(header.querySelector('.tema-toggle-mobile')).not.toBeNull();
    // o Entrar continua no header, com o tema à esquerda dele
    expect(header.querySelector('.btn-in-mobile')).toHaveTextContent('Entrar');
  });

  // A ordem é o pedido inteiro desta mudança: lupa junto do ativo, e
  // desfazer/refazer DEPOIS da régua, não antes.
  it('a ordem da toolbar é ativo → lupa → ☆ → timeframe → indicadores → régua → undo/redo', async () => {
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });

    const toolbar = document.querySelector('.atb');
    const ordem = [...toolbar.querySelectorAll('.atick, [title], select')]
      .map((el) => el.className.includes('atick') ? 'ativo'
        : el.tagName === 'SELECT' ? 'timeframe'
        : el.getAttribute('title'))
      .filter((x) => x && !/Voltar|Adicionar mesa|Fechar|painel/.test(x));

    const posicao = (re) => ordem.findIndex((x) => re.test(x));
    expect(posicao(/^ativo$/)).toBeLessThan(posicao(/Buscar ativo/));
    expect(posicao(/Buscar ativo/)).toBeLessThan(posicao(/favoritos/i));
    expect(posicao(/favoritos/i)).toBeLessThan(posicao(/^timeframe$/));
    expect(posicao(/^timeframe$/)).toBeLessThan(posicao(/Régua/));
    expect(posicao(/Régua/)).toBeLessThan(posicao(/Desfazer/));
    expect(posicao(/Desfazer/)).toBeLessThan(posicao(/Refazer/));
  });

  it('renderiza sem crash no mobile', async () => {
    renderApp('/ativo/PETR4.SA', { mobile: true });

    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });
    expect(document.querySelector('.analysis-wrap')).not.toBeNull();
  });
});
