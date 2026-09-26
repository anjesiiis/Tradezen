import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './helpers.jsx';

// O gráfico do TradingView é simulado nos testes (setup.js), então aqui a
// marcação em si não roda — o que se testa é a tela: os botões, a ordem
// deles e a instrução. As regras estão em bandeira.test.js.
const ROTULOS = {
  '/admin/templates/bandeira-alta': [
    'Início Mastro 1', 'Topo Mastro 1',
    'Início Fundo Bandeira', 'Fim Fundo Bandeira',
    'Início Topo Bandeira', 'Fim Topo Bandeira',
    'Início Mastro 2', 'Topo Mastro 2',
  ],
  '/admin/templates/bandeira-baixa': [
    'Início Mastro 1', 'Fundo Mastro 1',
    'Início Fundo Bandeira', 'Fim Fundo Bandeira',
    'Início Topo Bandeira', 'Fim Topo Bandeira',
    'Início Mastro 2', 'Fundo Mastro 2',
  ],
  '/admin/templates/flamula-alta': [
    'Início Mastro 1', 'Topo Mastro 1',
    'Início Fundo Flâmula', 'Fim Fundo Flâmula',
    'Início Topo Flâmula', 'Fim Topo Flâmula',
    'Início Mastro 2', 'Topo Mastro 2',
  ],
  '/admin/templates/flamula-baixa': [
    'Início Mastro 1', 'Fundo Mastro 1',
    'Início Fundo Flâmula', 'Fim Fundo Flâmula',
    'Início Topo Flâmula', 'Fim Topo Flâmula',
    'Início Mastro 2', 'Fundo Mastro 2',
  ],
  '/admin/templates/cunha-alta': [
    'Início Mastro 1', 'Topo Mastro 1',
    'Início Fundo Cunha', 'Fim Fundo Cunha',
    'Início Topo Cunha', 'Fim Topo Cunha',
    'Início Mastro 2', 'Topo Mastro 2',
  ],
  '/admin/templates/cunha-baixa': [
    'Início Mastro 1', 'Fundo Mastro 1',
    'Início Fundo Cunha', 'Fim Fundo Cunha',
    'Início Topo Cunha', 'Fim Topo Cunha',
    'Início Mastro 2', 'Fundo Mastro 2',
  ],
};

async function abrirMarcacao(rota) {
  localStorage.setItem('admin_token', 'token-de-teste');
  const user = userEvent.setup();
  renderApp(rota);
  await screen.findByText('Nova marcação');
  await user.click(screen.getByRole('button', { name: 'Carregar gráfico' }));
  await waitFor(() => expect(document.querySelectorAll('.admin-chip').length).toBe(8));
  return [...document.querySelectorAll('.admin-chip')].map((c) => c.textContent);
}

describe('Admin — marcação dos padrões de continuação', () => {
  it.each(Object.keys(ROTULOS))('%s: 8 pontos, em 4 pares', async (rota) => {
    expect(await abrirMarcacao(rota)).toEqual(ROTULOS[rota]);
  });

  it('a instrução diz qual ponto marcar agora', async () => {
    await abrirMarcacao('/admin/templates/flamula-alta');

    expect(screen.getByText(/Clique no gráfico para marcar: Início Mastro 1/)).toBeInTheDocument();
  });

  it('o primeiro botão começa destacado como ativo', async () => {
    await abrirMarcacao('/admin/templates/bandeira-baixa');

    const chips = [...document.querySelectorAll('.admin-chip')];
    expect(chips[0].className).toMatch(/active/);
    expect(chips.filter((c) => c.className.includes('active'))).toHaveLength(1);
  });

  it('tem o botão Limpar e ainda não mostra Salvar Template', async () => {
    await abrirMarcacao('/admin/templates/flamula-baixa');

    expect(screen.getByRole('button', { name: 'Limpar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Salvar Template/i })).not.toBeInTheDocument();
  });

  it('cada padrão tem seu próprio título', async () => {
    await abrirMarcacao('/admin/templates/flamula-baixa');

    expect(screen.getByText('Admin · Templates Flâmula de Baixa')).toBeInTheDocument();
  });

  it('anotação é um campo de texto de várias linhas', async () => {
    await abrirMarcacao('/admin/templates/bandeira-alta');

    const anotacao = screen.getByPlaceholderText(/o que chamou atenção nesse padrão/i);
    expect(anotacao.tagName).toBe('TEXTAREA');
  });
});

describe('Admin — seletor de padrão', () => {
  it('lista os 6 padrões e abre no padrão da rota', async () => {
    localStorage.setItem('admin_token', 'token-de-teste');
    renderApp('/admin/templates/flamula-alta');
    await screen.findByText('Nova marcação');

    const seletor = screen.getByTitle(/Trocar o padrão marcado/);
    expect([...seletor.options].map((o) => o.textContent)).toEqual([
      'Bandeira de Alta', 'Bandeira de Baixa', 'Flâmula de Alta', 'Flâmula de Baixa',
      'Cunha de Alta', 'Cunha de Baixa',
    ]);
    expect(seletor.value).toBe('flamula_alta');
  });

  it('trocar o padrão muda os pontos sem sair da página', async () => {
    const user = userEvent.setup();
    localStorage.setItem('admin_token', 'token-de-teste');
    renderApp('/admin/templates/bandeira-alta');
    await screen.findByText('Nova marcação');
    await user.click(screen.getByRole('button', { name: 'Carregar gráfico' }));
    await waitFor(() => expect(document.querySelectorAll('.admin-chip').length).toBe(8));
    expect(document.querySelectorAll('.admin-chip')[2]).toHaveTextContent('Início Fundo Bandeira');

    await user.selectOptions(screen.getByTitle(/Trocar o padrão marcado/), 'cunha_baixa');

    await waitFor(() => expect(document.querySelectorAll('.admin-chip')[2]).toHaveTextContent('Início Fundo Cunha'));
    expect(document.querySelectorAll('.admin-chip')[1]).toHaveTextContent('Fundo Mastro 1');
    expect(window.location.pathname).toBe('/admin/templates/bandeira-alta'); // não saiu da página
    expect(screen.getByText(/Marcados em Cunha de Baixa/)).toBeInTheDocument();
  });
});

describe('Admin — lista de marcações salvas', () => {
  it('mostra um card com ticker, data do P1 e a anotação', async () => {
    localStorage.setItem('admin_token', 'token-de-teste');
    renderApp('/admin/templates/bandeira-alta');
    await screen.findByText('Nova marcação');

    const card = await waitFor(() => {
      const el = document.querySelector('.admin-card-item');
      expect(el).not.toBeNull();
      return el;
    });
    const nele = within(card);
    expect(nele.getByText('PETR4.SA')).toBeInTheDocument();
    expect(nele.getByText('Bandeira de Alta')).toBeInTheDocument();
    expect(nele.getByText('01/07/2026')).toBeInTheDocument();
    expect(nele.getByText('rompimento forte, volume alto')).toBeInTheDocument();
  });
});
