import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext.jsx';
import Login from '../auth/Login.jsx';
import { supabase } from '../lib/supabaseClient.js';

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Login', () => {
  it('renderiza título, campo de email, campo de senha e botão Entrar', async () => {
    renderLogin();

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toHaveAttribute('type', 'email');
    expect(screen.getByPlaceholderText('Sua senha')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
    expect(screen.getByText('Cadastre-se grátis')).toBeInTheDocument();
    expect(screen.getByText('Esqueci minha senha')).toBeInTheDocument();
  });

  it('envia email (normalizado) e senha pro Supabase', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByPlaceholderText('seu@email.com'), ' Teste@Email.com ');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'senha12345');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'teste@email.com',
      password: 'senha12345',
    });
  });

  it('mostra mensagem amigável quando a senha está errada', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { message: 'Invalid login credentials' },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByPlaceholderText('seu@email.com'), 'a@b.com');
    await user.type(screen.getByPlaceholderText('Sua senha'), 'errada123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Email ou senha incorretos.')).toBeInTheDocument();
  });
});
