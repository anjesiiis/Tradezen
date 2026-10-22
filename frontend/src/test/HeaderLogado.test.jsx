import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Header from '../components/Header.jsx';

// O caso que faltava: usuário LOGADO numa tela estreita. Deslogado o
// header sempre teve o "Entrar"; logado, o acesso à conta vivia só no
// .nav-r, que o mobile esconde — sobrava o tema e mais nada, e o Sair
// ficava enterrado no menu hambúrguer.
vi.mock('../auth/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { email: 'anjesis@teste.com', user_metadata: { nome: 'Anjesis Silva' } },
    logout: vi.fn(),
  }),
}));

function montar() {
  return render(
    <MemoryRouter>
      <Header
        mercado={[]} abrirAtivo={() => {}}
        tema="dark" alternarTema={() => {}}
        secao="home" setSecao={() => {}}
        drawerAberto={false} setDrawerAberto={() => {}}
      />
    </MemoryRouter>
  );
}

const header = () => document.querySelector('nav.nav');

describe('Header com usuário logado', () => {
  it('o botão da conta aparece no header, com o primeiro nome', () => {
    montar();

    const conta = header().querySelector('.btn-in-mobile .btn-conta');
    expect(conta).not.toBeNull();
    expect(conta).toHaveTextContent('ANJESIS');
  });

  it('a conta fica ao lado do tema, no canto do mobile', () => {
    montar();

    const slot = header().querySelector('.btn-in-mobile');
    expect(slot.previousElementSibling).toHaveClass('tema-toggle-mobile');
  });

  // o do desktop continua onde estava — são dois, o CSS mostra um por largura
  it('o do desktop segue no .nav-r', () => {
    montar();

    expect(header().querySelector('.nav-r .btn-conta')).toHaveTextContent('ANJESIS');
  });

  it('clicar na conta abre o menu com o email e o Sair', async () => {
    const user = userEvent.setup();
    montar();

    await user.click(within(header().querySelector('.btn-in-mobile')).getByRole('button'));

    expect(screen.getByText('anjesis@teste.com')).toBeInTheDocument();
    expect(screen.getByText('Sair')).toBeInTheDocument();
  });
});
