import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext.jsx';
import Cadastro from '../auth/Cadastro.jsx';

function renderCadastro() {
  return render(
    <MemoryRouter initialEntries={['/cadastro']}>
      <AuthProvider>
        <Cadastro />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Cadastro', () => {
  it('renderiza título, campos nome/email/senha e botão de criar conta', async () => {
    renderCadastro();

    expect(await screen.findByRole('heading', { name: 'Criar conta' })).toBeInTheDocument();
    expect(screen.getByText('Nome completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Seu nome')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toHaveAttribute('type', 'email');
    expect(screen.getByPlaceholderText('Mínimo 8 caracteres')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Criar conta grátis' })).toBeEnabled();
  });
});
