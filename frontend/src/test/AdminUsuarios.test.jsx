// A tela do admin entra por lazy loading: a espera precisa caber o import
// do chunk, que com a suíte inteira rodando junto passa de 1s.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './helpers.jsx';

async function abrirUsuarios() {
  localStorage.setItem('admin_token', 'token-de-teste');
  renderApp('/admin/usuarios');
  await screen.findByText('Admin · Usuários', undefined, { timeout: 5000 });
}

function linhaDe(email) {
  const alvo = [...document.querySelectorAll('.usuarios-linha')]
    .find((l) => l.textContent.includes(email));
  expect(alvo).not.toBeUndefined();
  return alvo;
}

describe('Admin — usuários e planos', () => {
  it('lista os usuários com email, nome e plano', async () => {
    await abrirUsuarios();

    await waitFor(() => expect(document.querySelectorAll('.usuarios-linha').length).toBe(2));
    const premium = within(linhaDe('premium@teste.com'));
    expect(premium.getByText('Quem Assinou · cadastro 10/09/2026')).toBeInTheDocument();
    expect(premium.getByText('Premium')).toBeInTheDocument();
    expect(within(linhaDe('free@teste.com')).getByText('Free')).toBeInTheDocument();
  });

  it('a contagem separa quantos são premium', async () => {
    await abrirUsuarios();

    expect(await screen.findByText('2 usuários · 1 premium')).toBeInTheDocument();
  });

  // O botão é o oposto do plano atual: quem é free vira premium, e vice-versa
  it('o botão oferece a troca contrária ao plano de cada um', async () => {
    await abrirUsuarios();
    await waitFor(() => expect(document.querySelectorAll('.usuarios-linha').length).toBe(2));

    expect(within(linhaDe('free@teste.com')).getByRole('button', { name: 'Tornar Premium' })).toBeInTheDocument();
    expect(within(linhaDe('premium@teste.com')).getByRole('button', { name: 'Tornar Free' })).toBeInTheDocument();
  });

  it('liberar premium manda PATCH e atualiza só aquela linha', async () => {
    const user = userEvent.setup();
    await abrirUsuarios();
    await waitFor(() => expect(document.querySelectorAll('.usuarios-linha').length).toBe(2));

    await user.click(within(linhaDe('free@teste.com')).getByRole('button', { name: 'Tornar Premium' }));

    await waitFor(() => {
      expect(within(linhaDe('free@teste.com')).getByText('Premium')).toBeInTheDocument();
    });
    const chamada = globalThis.fetch.mock.calls
      .find(([url, opcoes]) => String(url).includes('/admin/usuarios/u-2/plano') && opcoes?.method === 'PATCH');
    expect(chamada).not.toBeUndefined();
    expect(JSON.parse(chamada[1].body)).toEqual({ plano: 'premium' });
    // a outra linha não foi mexida
    expect(within(linhaDe('premium@teste.com')).getByText('Premium')).toBeInTheDocument();
  });

  it('a busca filtra por email', async () => {
    const user = userEvent.setup();
    await abrirUsuarios();
    await waitFor(() => expect(document.querySelectorAll('.usuarios-linha').length).toBe(2));

    await user.type(screen.getByPlaceholderText(/Buscar por email ou nome/i), 'free@');

    await waitFor(() => expect(document.querySelectorAll('.usuarios-linha').length).toBe(1));
    expect(screen.getByText('free@teste.com')).toBeInTheDocument();
  });
});
