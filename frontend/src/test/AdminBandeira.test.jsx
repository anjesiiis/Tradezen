import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './helpers.jsx';

const ALTA = [
  'Início Mastro 1', 'Topo Mastro 1',
  'Início Fundo Bandeira', 'Fim Fundo Bandeira',
  'Início Topo Bandeira', 'Fim Topo Bandeira',
  'Início Mastro 2', 'Topo Mastro 2',
];
const BAIXA = ['Início do Mastro', 'Fundo do Mastro', 'Topo 1', 'Fundo 1', 'Topo 2', 'Rompimento'];

// O gráfico do TradingView é simulado nos testes (setup.js), então aqui a
// marcação em si não roda — o que se testa é a tela: os botões, a ordem
// deles e a instrução. As regras estão em bandeira.test.js.
async function abrirMarcacao(rota, quantos) {
  localStorage.setItem('admin_token', 'token-de-teste');
  const user = userEvent.setup();
  renderApp(rota);
  await screen.findByText('Nova marcação');
  await user.click(screen.getByRole('button', { name: 'Carregar gráfico' }));
  await waitFor(() => expect(document.querySelectorAll('.admin-chip').length).toBe(quantos));
  return [...document.querySelectorAll('.admin-chip')].map((c) => c.textContent);
}

describe('Admin — marcação de bandeira', () => {
  it('bandeira de alta: 8 pontos, em 4 pares', async () => {
    expect(await abrirMarcacao('/admin/templates/bandeira-alta', 8)).toEqual(ALTA);
  });

  it('bandeira de baixa: segue com os 6 pontos cronológicos espelhados', async () => {
    expect(await abrirMarcacao('/admin/templates/bandeira-baixa', 6)).toEqual(BAIXA);
  });

  it('a instrução diz qual ponto marcar agora', async () => {
    await abrirMarcacao('/admin/templates/bandeira-alta', 8);

    expect(screen.getByText(/Clique no gráfico para marcar: Início Mastro 1/)).toBeInTheDocument();
  });

  it('o primeiro botão começa destacado como ativo', async () => {
    await abrirMarcacao('/admin/templates/bandeira-alta', 8);

    const chips = [...document.querySelectorAll('.admin-chip')];
    expect(chips[0].className).toMatch(/active/);
    expect(chips.filter((c) => c.className.includes('active'))).toHaveLength(1);
  });

  it('tem o botão Limpar e ainda não mostra Salvar Template', async () => {
    await abrirMarcacao('/admin/templates/bandeira-alta', 8);

    expect(screen.getByRole('button', { name: 'Limpar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Salvar Template/i })).not.toBeInTheDocument();
  });
});
