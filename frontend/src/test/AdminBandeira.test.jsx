import { screen, waitFor } from '@testing-library/react';
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
});
