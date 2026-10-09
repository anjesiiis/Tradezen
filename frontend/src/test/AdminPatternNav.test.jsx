import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AdminPatternNav } from '../admin/theme.jsx';
import { GRUPOS_DE_PADRAO, grupoDoPadrao } from '../admin/gruposDePadrao.js';

// 19 padrões não cabem em aba — nem numa linha, nem em duas. O menu
// lateral agrupa por família e abre só o grupo do padrão atual.
function montar(active = 'canal-alta', aoTrocar) {
  return render(
    <MemoryRouter>
      <AdminPatternNav active={active} aoTrocar={aoTrocar} />
    </MemoryRouter>,
  );
}

const grupos = () => [...document.querySelectorAll('.admin-nav-grupo-titulo')];
const itens = () => document.querySelectorAll('.admin-nav-itens a');

describe('Menu lateral de padrões do admin', () => {
  it('tem os quatro grupos, nessa ordem', () => {
    montar();
    expect(grupos().map((g) => g.textContent.replace(/[▾▸]/g, '').trim())).toEqual([
      '🔴🟢Reversão', '🔵🟡Continuação', '🔵Canais e Triângulos', '⬜💡Neutros',
    ]);
  });

  it('os 19 padrões estão distribuídos entre os grupos, sem repetir', () => {
    const todos = GRUPOS_DE_PADRAO.flatMap((g) => g.itens.map((i) => i.key));
    expect(todos).toHaveLength(19);
    expect(new Set(todos).size).toBe(19);
    // as rotas não mudaram
    expect(GRUPOS_DE_PADRAO[0].itens.find((i) => i.key === 'oco').href).toBe('/admin/templates');
    expect(GRUPOS_DE_PADRAO[3].itens.find((i) => i.key === 'niveis').href).toBe('/admin/templates/niveis');
    for (const g of GRUPOS_DE_PADRAO) {
      for (const i of g.itens) {
        expect(i.href, i.key).toMatch(/^\/admin\/templates(\/[a-z-]+)?$/);
      }
    }
  });

  it('abre só o grupo do padrão atual, com ele destacado', () => {
    montar('canal-alta');

    const abertos = grupos().filter((g) => g.getAttribute('aria-expanded') === 'true');
    expect(abertos.map((g) => g.textContent)).toHaveLength(1);
    expect(abertos[0].textContent).toContain('Canais e Triângulos');
    // só os 5 itens desse grupo aparecem
    expect(itens()).toHaveLength(5);
    expect(document.querySelector('.admin-nav-itens a.active').textContent).toContain('Canal de Alta');
  });

  it('cada tela abre no grupo dela', () => {
    expect(grupoDoPadrao('topo-duplo').id).toBe('reversao');
    expect(grupoDoPadrao('flamula-baixa').id).toBe('continuacao');
    expect(grupoDoPadrao('triangulo-simetrico').id).toBe('canais');
    expect(grupoDoPadrao('retangulo').id).toBe('neutros');
    expect(grupoDoPadrao('nao-existe')).toBeNull();
  });

  it('clicar no título abre e fecha o grupo', async () => {
    const user = userEvent.setup();
    montar('canal-alta');
    const reversao = grupos().find((g) => g.textContent.includes('Reversão'));

    await user.click(reversao);
    expect(itens()).toHaveLength(11);      // 5 de canais + 6 de reversão
    expect(within(document.querySelector('.admin-nav-grupos')).getByText('OCO Invertido')).toBeInTheDocument();

    await user.click(reversao);
    expect(itens()).toHaveLength(5);
  });

  it('o link leva pra rota do padrão, sem recarregar o app', async () => {
    const user = userEvent.setup();
    montar('canal-alta');

    const link = screen.getByRole('link', { name: /Canal de Baixa/ });
    expect(link).toHaveAttribute('href', '/admin/templates/canal-baixa');
    await user.click(link);   // Link do router: não navega de verdade no teste
  });

  it('a tela pode assumir o clique e trocar o padrão no lugar', async () => {
    const user = userEvent.setup();
    const aoTrocar = vi.fn(() => true);   // true = "eu cuido disso"
    montar('canal-alta', aoTrocar);

    await user.click(screen.getByRole('link', { name: /Canal de Baixa/ }));

    expect(aoTrocar).toHaveBeenCalledWith('canal-baixa', '/admin/templates/canal-baixa');
  });

  it('no celular o botão do topo mostra o padrão atual', () => {
    montar('retangulo');
    expect(document.querySelector('.admin-nav-atual').textContent).toContain('Retângulo');
  });
});
