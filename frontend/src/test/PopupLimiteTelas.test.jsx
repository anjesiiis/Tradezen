import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PopupLimiteTelas, { foiVistoNaSessao, marcarVistoNaSessao } from '../components/PopupLimiteTelas.jsx';
import { motivoDoBloqueio } from '../lib/limitesTelas.js';

const montar = (motivo) => {
  const aoFechar = vi.fn();
  render(<PopupLimiteTelas motivo={motivo} aoFechar={aoFechar}/>);
  return { aoFechar };
};

describe('Popup do limite de telas', () => {
  beforeEach(() => sessionStorage.clear());

  it('não aparece sem motivo', () => {
    montar(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Os dois nomes tinham que bater: `motivoDoBloqueio` devolvia "cadastro"
  // e o conteúdo estava em "cadastrado", então o popup abria VAZIO pra
  // quem não tem conta — justamente o caso principal da feature.
  it('todo motivo que o limite produz tem conteúdo de verdade', () => {
    for (const motivo of [motivoDoBloqueio(null, 'free'), motivoDoBloqueio({ id: 'u' }, 'free')]) {
      const { unmount } = render(<PopupLimiteTelas motivo={motivo} aoFechar={() => {}}/>);
      expect(screen.getByRole('dialog'), motivo).toBeInTheDocument();
      expect(screen.getAllByRole('listitem').length, motivo).toBeGreaterThan(0);
      unmount();
    }
  });

  describe('visitante — convite pra criar conta', () => {
    // Regra crítica: preço pra quem nem tem conta é cobrar antes de
    // mostrar o produto.
    it('não mostra preço nenhum', () => {
      montar('cadastrado');
      expect(document.body.textContent).not.toMatch(/R\$|49/);
      expect(screen.queryByText('PREMIUM')).not.toBeInTheDocument();
    });

    it('leva pro cadastro e pro login, com links de verdade', () => {
      montar('cadastrado');
      expect(screen.getByRole('link', { name: /criar conta/i })).toHaveAttribute('href', '/cadastro');
      expect(screen.getByRole('link', { name: /já tenho conta/i })).toHaveAttribute('href', '/login');
    });

    it('fala da segunda tela, que é o que ele ganha', () => {
      montar('cadastrado');
      expect(screen.getByText(/2 telas simultâneas/i)).toBeInTheDocument();
    });
  });

  describe('conta grátis — convite pro premium', () => {
    // Regra crítica: quem já é cadastrado não pode receber convite pra se
    // cadastrar.
    it('não convida a criar conta', () => {
      montar('upgrade');
      expect(screen.queryByRole('link', { name: /criar conta/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /já tenho conta/i })).not.toBeInTheDocument();
    });

    // O preço e o número de telas são os MESMOS da página de vendas. Dois
    // preços pro mesmo produto é o pior dos mundos.
    it('mostra o preço da página de vendas: R$ 49,90/mês', () => {
      montar('upgrade');
      expect(screen.getByText('R$ 49')).toBeInTheDocument();
      expect(document.body.textContent).toMatch(/,90/);
      expect(document.body.textContent).toMatch(/\/mês/);
    });

    it('fala em 4 telas, que é o que o Premium vende', () => {
      montar('upgrade');
      expect(screen.getByText(/4 telas simultâneas/i)).toBeInTheDocument();
      // 6 era o número do pedido original; a página de vendas diz 4
      expect(document.body.textContent).not.toMatch(/6 telas/);
    });

    it('o botão leva pra seção de preços, única página de plano que existe', () => {
      montar('upgrade');
      expect(screen.getByRole('link', { name: /ver o premium/i }))
        .toHaveAttribute('href', '/pagina-de-vendas#precos');
    });
  });

  describe('fechar', () => {
    it.each([['o ✕', 'Fechar'], ['o "Agora não"', 'Agora não']])(
      '%s fecha', async (_rotulo, nome) => {
        const user = userEvent.setup();
        const { aoFechar } = montar('cadastrado');

        await user.click(screen.getByRole('button', { name: nome }));

        expect(aoFechar).toHaveBeenCalled();
      },
    );

    it('clicar no fundo fecha', async () => {
      const user = userEvent.setup();
      const { aoFechar } = montar('cadastrado');

      await user.click(document.querySelector('.plt-fundo'));

      expect(aoFechar).toHaveBeenCalled();
    });

    it('clicar dentro do cartão NÃO fecha', async () => {
      const user = userEvent.setup();
      const { aoFechar } = montar('cadastrado');

      await user.click(screen.getByRole('dialog'));

      expect(aoFechar).not.toHaveBeenCalled();
    });

    it('Esc fecha', async () => {
      const user = userEvent.setup();
      const { aoFechar } = montar('cadastrado');

      await user.keyboard('{Escape}');

      expect(aoFechar).toHaveBeenCalled();
    });
  });

  describe('uma vez por sessão', () => {
    it('a marca é por motivo: recusar o cadastro não cala o upgrade', () => {
      expect(foiVistoNaSessao('cadastrado')).toBe(false);

      marcarVistoNaSessao('cadastrado');

      expect(foiVistoNaSessao('cadastrado')).toBe(true);
      expect(foiVistoNaSessao('upgrade')).toBe(false);
    });

    // sessionStorage e não localStorage: aba nova pode ver de novo, que é
    // o item 3 do plano de teste.
    it('a marca morre com a aba, não com o navegador', () => {
      marcarVistoNaSessao('upgrade');

      expect(localStorage.getItem('tradezen-popup-limite-visto-upgrade')).toBeNull();
      expect(sessionStorage.getItem('tradezen-popup-limite-visto-upgrade')).toBe('1');
    });

    it('storage bloqueado não derruba a tela', () => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { throw new Error('bloqueado'); };
      try {
        expect(() => marcarVistoNaSessao('cadastrado')).not.toThrow();
      } finally {
        Storage.prototype.setItem = original;
      }
    });
  });

  it('é anunciado como diálogo e recebe o foco', () => {
    montar('upgrade');
    const caixa = screen.getByRole('dialog');

    expect(caixa).toHaveAttribute('aria-modal', 'true');
    expect(caixa).toHaveFocus();
  });
});
