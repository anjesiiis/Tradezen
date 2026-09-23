import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './helpers.jsx';

const ALTA = ['Início do Mastro', 'Topo do Mastro', 'Fundo 1', 'Topo 1', 'Fundo 2', 'Rompimento'];
const BAIXA = ['Início do Mastro', 'Fundo do Mastro', 'Topo 1', 'Fundo 1', 'Topo 2', 'Rompimento'];

// O gráfico do TradingView é simulado nos testes (setup.js), então aqui a
// marcação em si não roda — o que se testa é a tela: os botões, a ordem
// deles e a instrução. As regras estão em bandeira.test.js.
async function abrirMarcacao(rota) {
  localStorage.setItem('admin_token', 'token-de-teste');
  const user = userEvent.setup();
  renderApp(rota);
  await screen.findByText('Nova marcação');
  await user.click(screen.getByRole('button', { name: 'Carregar gráfico' }));
  await waitFor(() => expect(document.querySelectorAll('.admin-chip').length).toBe(6));
  return [...document.querySelectorAll('.admin-chip')].map((c) => c.textContent);
}

describe('Admin — marcação de bandeira', () => {
  it('bandeira de alta: 6 pontos na ordem cronológica', async () => {
    expect(await abrirMarcacao('/admin/templates/bandeira-alta')).toEqual(ALTA);
  });

  it('bandeira de baixa: os mesmos 6 pontos, espelhados', async () => {
    expect(await abrirMarcacao('/admin/templates/bandeira-baixa')).toEqual(BAIXA);
  });

  it('a instrução diz qual ponto marcar agora', async () => {
    await abrirMarcacao('/admin/templates/bandeira-alta');

    expect(screen.getByText(/Clique no gráfico para marcar: Início do Mastro/)).toBeInTheDocument();
  });

  it('tem o botão Limpar e ainda não mostra Salvar Template', async () => {
    await abrirMarcacao('/admin/templates/bandeira-alta');

    expect(screen.getByRole('button', { name: 'Limpar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Salvar Template/i })).not.toBeInTheDocument();
  });
});
