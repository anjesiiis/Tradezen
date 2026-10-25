import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './helpers.jsx';
import {
  avatarDoPerfil, formatarTelefone, iniciaisDoNome, mudancas, nomeValido, telefoneValido,
} from '../lib/perfil.js';

describe('Perfil — as regras', () => {
  it('monta as iniciais do nome, e cai no email quando não há nome', () => {
    expect(iniciaisDoNome('Antonio Jose Morais')).toBe('AM');
    expect(iniciaisDoNome('Antonio')).toBe('AN');
    expect(iniciaisDoNome('', 'ajsemsaida@gmail.com')).toBe('AJ');
    expect(iniciaisDoNome('', '')).toBe('?');
  });

  // a máscara formata enquanto digita e não deixa passar de 11 dígitos:
  // assim ninguém descobre que o número é impossível só ao salvar
  it.each([
    ['8', '8'],
    ['8599', '(85) 99'],
    ['8533334444', '(85) 3333-4444'],
    ['85999998888', '(85) 99999-8888'],
    ['859999988887777', '(85) 99999-8888'],
  ])('formata %s como %s', (entrada, saida) => {
    expect(formatarTelefone(entrada)).toBe(saida);
  });

  it('telefone vazio é válido — o campo é opcional', () => {
    expect(telefoneValido('')).toBe(true);
    expect(telefoneValido('(85) 3333-4444')).toBe(true);
    expect(telefoneValido('(85) 99999-8888')).toBe(true);
    expect(telefoneValido('(85) 9999')).toBe(false);
  });

  it('o nome tem de 2 a 40 caracteres', () => {
    expect(nomeValido('A')).toBe(false);
    expect(nomeValido('Ana')).toBe(true);
    expect(nomeValido('x'.repeat(41))).toBe(false);
  });

  it('o avatar é o emoji escolhido, ou as iniciais', () => {
    expect(avatarDoPerfil({ avatar_tipo: 'emoji', avatar_valor: '🐂' })).toEqual({ tipo: 'emoji', valor: '🐂' });
    expect(avatarDoPerfil({ nome: 'Ana Lima' })).toEqual({ tipo: 'iniciais', valor: 'AL' });
    // tipo sem valor não vira avatar quebrado
    expect(avatarDoPerfil({ avatar_tipo: 'emoji' }, 'a@b.com').tipo).toBe('iniciais');
  });

  it('só manda pro banco o que mudou', () => {
    const antes = { nome: 'Ana', telefone: null, avatar_tipo: null, avatar_valor: null };
    expect(mudancas(antes, { ...antes })).toEqual({});
    expect(mudancas(antes, { ...antes, nome: 'Ana Lima' })).toEqual({ nome: 'Ana Lima' });
  });
});

describe('Configurações — a tela', () => {
  const abrir = async (rota = '/configuracoes') => {
    renderApp(rota);
    return screen.findByRole('heading', { name: 'Configurações' }, { timeout: 5000 });
  };

  it('deslogado, manda pro login em vez de mostrar a conta', async () => {
    renderApp('/configuracoes');

    await waitFor(() => expect(window.location.pathname).toBe('/login'), { timeout: 5000 });
  });
});

describe('Configurações — logado', () => {
  // A tela só existe com sessão; o AuthContext é trocado aqui porque o
  // Supabase dos testes não tem usuário.
  beforeAll(() => {
    vi.doMock('../auth/AuthContext.jsx', () => ({
      useAuth: () => ({
        user: { id: 'u-1', email: 'antonio@teste.com', user_metadata: { nome: 'Antonio Jose' } },
        loading: false,
      }),
    }));
  });
  afterAll(() => vi.doUnmock('../auth/AuthContext.jsx'));

  const montar = async () => {
    vi.resetModules();
    const { render } = await import('@testing-library/react');
    const { MemoryRouter } = await import('react-router-dom');
    const { default: Configuracoes } = await import('../pages/Configuracoes.jsx');
    render(<MemoryRouter initialEntries={['/configuracoes']}><Configuracoes/></MemoryRouter>);
    return screen.findByRole('heading', { name: 'Configurações' }, { timeout: 5000 });
  };

  // A página é aberta direto pela URL, sem passar por Landing nem
  // Dashboard — que são quem injeta o CSS do app. Sem a injeção aqui, a
  // tela vinha sem estilo nenhum, parecendo HTML cru.
  it('injeta o CSS do app — senão a tela abre sem estilo', async () => {
    await montar();

    const estilos = [...document.querySelectorAll('style')].map((s) => s.textContent).join('');
    expect(estilos).toContain('.cfg-bloco');
    expect(estilos).toContain('.cfg-abas');
    // e o estilo chega mesmo ao elemento
    expect(getComputedStyle(document.querySelector('.cfg-bloco')).padding).not.toBe('');
  });

  it('mostra as quatro seções', async () => {
    await montar();

    expect(document.querySelectorAll('.cfg-aba')).toHaveLength(4);
    for (const r of ['Perfil', 'Segurança', 'Plano e cobrança', 'Notificações']) {
      expect(screen.getByRole('button', { name: new RegExp(r) })).toBeInTheDocument();
    }
  });

  it('abre no Perfil, com nome e email preenchidos', async () => {
    await montar();

    await waitFor(() => expect(screen.getByPlaceholderText(/Como você quer ser chamado/)).toHaveValue('Antonio Jose'));
    expect(screen.getByDisplayValue('antonio@teste.com')).toBeDisabled();
  });

  // o botão só acende quando há o que salvar: sem isso a pessoa clica à toa
  it('o botão de salvar nasce desligado e acende ao mudar algo', async () => {
    const user = userEvent.setup();
    await montar();
    await waitFor(() => expect(screen.getByPlaceholderText(/Como você quer ser chamado/)).toHaveValue('Antonio Jose'));
    const salvar = screen.getByRole('button', { name: 'Salvar alterações' });
    expect(salvar).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/Como você quer ser chamado/), ' Morais');

    expect(salvar).not.toBeDisabled();
  });

  it('escolher um emoji troca o avatar', async () => {
    const user = userEvent.setup();
    await montar();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Escolher emoji' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Escolher emoji' }));
    await user.click(screen.getByLabelText('Touro — mercado em alta'));

    expect(within(document.querySelector('.cfg-avatar')).getByText('🐂')).toBeInTheDocument();
  });

  it('telefone incompleto avisa e trava o salvar', async () => {
    const user = userEvent.setup();
    await montar();
    await waitFor(() => expect(screen.getByPlaceholderText('(85) 99999-9999')).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText('(85) 99999-9999'), '8599');

    expect(screen.getByText(/Faltam dígitos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });

  it('as abas ainda não prontas dizem o que vem, em vez de nada', async () => {
    const user = userEvent.setup();
    await montar();

    await user.click(screen.getByRole('button', { name: /Segurança/ }));

    expect(screen.getByText(/ainda está sendo construída/)).toBeInTheDocument();
    expect(screen.getByText('Autenticação em dois fatores')).toBeInTheDocument();
  });
});
