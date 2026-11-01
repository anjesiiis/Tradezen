import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { chaveDoAberto, useSubirAoAbrir } from '../admin/subirAoAbrir.js';

// Os cards dos templates ficam no FIM da página e o gráfico no começo:
// clicar em Visualizar montava o gráfico lá em cima e deixava a pessoa
// parada embaixo, parecendo que o clique não fez nada.

// Tela de mentira com a mesma forma das quatro telas de marcação: uma
// seção que só existe quando há algo aberto, e o ref nela.
function TelaFalsa({ inicial = null }) {
  const [editando, setEditando] = useState(inicial);
  const ref = useSubirAoAbrir(chaveDoAberto(editando));
  return (
    <div>
      {editando && <section ref={ref} data-testid="secao">#{editando.id}</section>}
      <button onClick={() => setEditando({ id: 7 })}>abrir 7</button>
      <button onClick={() => setEditando({ id: 9 })}>abrir 9</button>
      {/* arrastar um ponto troca o objeto do editando sem trocar o id */}
      <button onClick={() => setEditando((e) => ({ ...e, pontos: Math.random() }))}>mexer</button>
      <button onClick={() => setEditando(null)}>fechar</button>
    </div>
  );
}

// fireEvent e nao .click() direto: ele embrulha em act(), e sem isso o
// effect que rola nao chega a rodar antes da verificacao.
const clicar = (texto) => fireEvent.click(screen.getByRole('button', { name: texto }));

describe('Abrir um template sobe até o gráfico', () => {
  let rolagens;

  beforeEach(() => {
    rolagens = [];
    Element.prototype.scrollIntoView = function (opcoes) {
      rolagens.push({ alvo: this.dataset.testid, ...opcoes });
    };
  });
  afterEach(() => { delete Element.prototype.scrollIntoView; });

  it('não rola quando nada está aberto', () => {
    render(<TelaFalsa/>);
    expect(rolagens).toHaveLength(0);
  });

  it('abrir rola até a seção do gráfico, pelo topo dela', () => {
    render(<TelaFalsa/>);

    clicar('abrir 7');

    expect(rolagens).toHaveLength(1);
    expect(rolagens[0].alvo).toBe('secao');
    expect(rolagens[0].block).toBe('start');
  });

  it('abre já aberto (volta de URL /visualizar) também rola', () => {
    render(<TelaFalsa inicial={{ id: 7 }}/>);
    expect(rolagens).toHaveLength(1);
  });

  // O defeito que isto previne: arrastar um ponto troca o objeto do
  // `editando` a cada quadro. Rolar a cada quadro prenderia a página no
  // topo justamente enquanto a pessoa tenta mexer no gráfico.
  it('mexer no template aberto NÃO rola de novo', () => {
    render(<TelaFalsa/>);
    clicar('abrir 7');

    clicar('mexer');
    clicar('mexer');

    expect(rolagens).toHaveLength(1);
  });

  it('trocar de template rola de novo', () => {
    render(<TelaFalsa/>);
    clicar('abrir 7');

    clicar('abrir 9');

    expect(rolagens).toHaveLength(2);
  });

  // 7 → null → 7: a chave passa por null no meio, e é isso que faz o
  // effect rodar outra vez no mesmo id.
  it('fechar e reabrir o MESMO template rola de novo', () => {
    render(<TelaFalsa/>);
    clicar('abrir 7');

    clicar('fechar');
    clicar('abrir 7');

    expect(rolagens).toHaveLength(2);
  });

  it('fechar não rola', () => {
    render(<TelaFalsa/>);
    clicar('abrir 7');

    clicar('fechar');

    expect(rolagens).toHaveLength(1);
  });

  describe('ambiente sem suporte', () => {
    // jsdom não implementa scrollIntoView, e navegador antigo pode não
    // ter. Sem o guarda, abrir um template derrubaria a tela inteira.
    it('sem scrollIntoView, abrir continua funcionando', () => {
      delete Element.prototype.scrollIntoView;

      expect(() => {
        render(<TelaFalsa/>);
        clicar('abrir 7');
      }).not.toThrow();
    });

    it('quem pediu menos movimento vai direto, sem animação', () => {
      window.matchMedia = () => ({ matches: true });
      try {
        render(<TelaFalsa/>);
        clicar('abrir 7');
        expect(rolagens[0].behavior).toBe('auto');
      } finally {
        delete window.matchMedia;
      }
    });

    it('sem matchMedia, usa a animação e não quebra', () => {
      const original = window.matchMedia;
      delete window.matchMedia;
      try {
        render(<TelaFalsa/>);
        clicar('abrir 7');
        expect(rolagens[0].behavior).toBe('smooth');
      } finally {
        if (original) window.matchMedia = original;
      }
    });
  });
});

describe('A chave do que está aberto', () => {
  // `editando?.id` sozinho devolve undefined, que não é null — e o effect
  // trata os dois diferente.
  it('nada aberto é null, não undefined', () => {
    expect(chaveDoAberto(null)).toBeNull();
    expect(chaveDoAberto(undefined)).toBeNull();
    expect(chaveDoAberto({})).toBeNull();
  });

  it('aberto é o id', () => {
    expect(chaveDoAberto({ id: 42, ticker: 'PETR4.SA' })).toBe(42);
  });
});
