import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './helpers.jsx';
import { avaliarSenha } from '../auth/forcaSenha.js';

describe('Força da senha — a regra', () => {
  // os casos da especificação, um a um
  it.each([
    ['abc',       1, 'fraca'],   // só minúscula
    ['abc123',    2, 'fraca'],   // minúscula + número
    ['Abc123',    3, 'media'],   // + maiúscula, mas curta e sem especial
    ['Abc12345',  4, 'media'],   // 8 caracteres, ainda sem especial
    ['Abc123!@',  5, 'forte'],   // todos
  ])('%s → %i critério(s), %s', (senha, atendidos, nivel) => {
    const r = avaliarSenha(senha);
    expect(r.atendidos).toBe(atendidos);
    expect(r.nivel).toBe(nivel);
    expect(r.forte).toBe(nivel === 'forte');
  });

  it('senha vazia não quebra e não é forte', () => {
    expect(avaliarSenha().atendidos).toBe(0);
    expect(avaliarSenha('').forte).toBe(false);
  });

  // lista fechada de símbolos deixa de fora o que ninguém lembrou
  it('aceita qualquer símbolo como especial, não só os do teclado americano', () => {
    for (const senha of ['Senha123ç', 'Senha123€', 'Senha123–', 'Senha123!']) {
      expect(avaliarSenha(senha).criterios.especial, senha).toBe(true);
    }
    expect(avaliarSenha('Senha 1234').criterios.especial).toBe(false);  // espaço não conta
  });

  it('as cores saem da paleta, não são inventadas', () => {
    expect(avaliarSenha('abc').cor).toBe('var(--down)');
    expect(avaliarSenha('Abc123').cor).toBe('var(--gold)');
    expect(avaliarSenha('Abc123!@').cor).toBe('var(--up)');
  });
});

describe('Cadastro — a tela', () => {
  const abrir = async () => {
    renderApp('/cadastro');
    return screen.findByRole('button', { name: /Criar conta/i }, { timeout: 5000 });
  };
  const senha = () => document.querySelector('input[type="password"]');

  it('a lista de requisitos só aparece depois da primeira tecla', async () => {
    const user = userEvent.setup();
    await abrir();
    expect(document.querySelector('.senha-criterios')).toBeNull();

    await user.type(senha(), 'a');

    expect(document.querySelector('.senha-criterios')).not.toBeNull();
    expect(screen.getByText('Pelo menos 8 caracteres')).toBeInTheDocument();
  });

  it('o botão de criar conta fica travado até a senha ficar forte', async () => {
    const user = userEvent.setup();
    const botao = await abrir();
    expect(botao).toBeDisabled();

    await user.type(senha(), 'Abc12345');
    expect(screen.getByText('Senha média')).toBeInTheDocument();
    expect(botao).toBeDisabled();

    await user.type(senha(), '!');
    await waitFor(() => expect(screen.getByText('Senha forte')).toBeInTheDocument());
    expect(botao).not.toBeDisabled();
  });

  it('os critérios atendidos vão ficando marcados conforme se digita', async () => {
    const user = userEvent.setup();
    await abrir();

    await user.type(senha(), 'abcdefgh');
    const marcados = () => [...document.querySelectorAll('.senha-criterios li.ok')].map(li => li.textContent);
    expect(marcados()).toEqual(['✓Pelo menos 8 caracteres', '✓Uma letra minúscula (a-z)']);

    await user.type(senha(), 'A1!');
    await waitFor(() => expect(marcados()).toHaveLength(5));
  });

  it('a barra cresce com o número de critérios', async () => {
    const user = userEvent.setup();
    await abrir();
    const barra = () => document.querySelector('.senha-barra-preenchida');

    await user.type(senha(), 'abc');
    expect(barra().style.width).toBe('20%');

    await user.type(senha(), 'Defg123!');
    expect(barra().style.width).toBe('100%');
  });
});
