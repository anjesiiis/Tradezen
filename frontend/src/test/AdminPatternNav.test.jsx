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
  // Reversão e os neutros estão ocultos enquanto o foco é continuação,
  // canais e as bandeiras de falha. Continuam no código, com rota, tela e
  // templates salvos — só não aparecem (ver `oculto` em gruposDePadrao).
  it('mostra só os grupos em uso, nessa ordem', () => {
    montar();
    expect(grupos().map((g) => g.textContent.replace(/[▾▸]/g, '').trim())).toEqual([
      '🔵🟡Continuação', '🔵Canais e Triângulos', '🔴🟢Suporte e Resistência', '🏴Bandeiras de falha',
    ]);
  });

  it('o grupo de reversão existe no dado, mas não é renderizado', () => {
    montar();
    expect(GRUPOS_DE_PADRAO.find((g) => g.id === 'reversao').oculto).toBe(true);
    expect(screen.queryByText(/Reversão/)).not.toBeInTheDocument();
    expect(screen.queryByText('Topo Duplo')).not.toBeInTheDocument();
  });

  it('suporte e resistência continua visível; o retângulo não', async () => {
    const user = userEvent.setup();
    montar();

    await user.click(grupos().find((g) => g.textContent.includes('Suporte e Resistência')));

    expect(screen.getByText('Suporte/Resistência')).toBeInTheDocument();
    expect(screen.queryByText('Retângulo')).not.toBeInTheDocument();
  });

  it('o grupo do que deu errado vem destacado em vermelho', () => {
    montar();
    const fracassos = grupos().find((g) => g.textContent.includes('Bandeiras de falha'));
    // o que se marca ali é o contrário do padrão: não pode parecer igual
    expect(fracassos).toHaveClass('perigo');
    expect(grupos().filter((g) => g.className.includes('perigo'))).toHaveLength(1);
  });

  it('os padrões estão distribuídos entre os grupos, sem repetir', () => {
    const todos = GRUPOS_DE_PADRAO.flatMap((g) => g.itens.map((i) => i.key));
    // 19 padrões + 2 fracassos de bandeira + a tela de revisão
    expect(todos).toHaveLength(22);
    expect(new Set(todos).size).toBe(22);
    // as rotas não mudaram
    const item = (chave) => GRUPOS_DE_PADRAO.flatMap((g) => g.itens).find((i) => i.key === chave);
    expect(item('oco').href).toBe('/admin/templates');
    expect(item('niveis').href).toBe('/admin/templates/niveis');
    for (const g of GRUPOS_DE_PADRAO) {
      for (const i of g.itens) {
        // a revisão é a única que não é tela de marcação
        expect(i.href, i.key).toMatch(/^\/admin\/(templates(\/[a-z-]+)?|o-que-deu-errado)$/);
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
    expect(grupoDoPadrao('fracasso-bandeira-alta').id).toBe('fracassos');
    expect(grupoDoPadrao('nao-existe')).toBeNull();
  });

  it('clicar no título abre e fecha o grupo', async () => {
    const user = userEvent.setup();
    montar('canal-alta');
    const continuacao = grupos().find((g) => g.textContent.includes('Continuação'));

    await user.click(continuacao);
    expect(itens()).toHaveLength(11);      // 5 de canais + 6 de continuação
    expect(within(document.querySelector('.admin-nav-grupos')).getByText('Cunha de Alta')).toBeInTheDocument();

    await user.click(continuacao);
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
