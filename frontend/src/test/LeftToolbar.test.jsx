import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeftToolbar from '../components/chart/LeftToolbar.jsx';
import { GRUPOS_FERRAMENTAS, guardarFerramenta, lerFerramentaSalva } from '../components/chart/ferramentasGrafico.js';

// A barra só ESCOLHE a ferramenta; quem desenha é o CandleChart. Por isso
// os testes olham o que ela emite e o que ela acende, não o gráfico.
function montar(props = {}) {
  const aoEscolher = vi.fn();
  const aoAgir = vi.fn();
  const utils = render(<LeftToolbar ativa={null} aoEscolher={aoEscolher} aoAgir={aoAgir} {...props} />);
  return { ...utils, aoEscolher, aoAgir };
}

const botao = (nome) => screen.getByRole('button', { name: nome });

describe('Barra de ferramentas do gráfico', () => {
  beforeEach(() => localStorage.clear());

  it('mostra os grupos, do cursor ao rodapé', () => {
    montar();
    expect(document.querySelectorAll('.chart-toolbar-grupo')).toHaveLength(7);
    for (const nome of ['Cursor', 'Linha de tendência', 'Retângulo', 'Fibonacci — retração',
      'Texto', 'Padrões do TradeZen', 'Limpar desenhos', 'Configurações do gráfico']) {
      expect(botao(nome)).toBeInTheDocument();
    }
  });

  it('clicar numa ferramenta avisa quem desenha', async () => {
    const user = userEvent.setup();
    const { aoEscolher } = montar();

    await user.click(botao('Linha horizontal'));

    expect(aoEscolher).toHaveBeenCalledWith('horizontal');
  });

  it('a ferramenta armada fica acesa', () => {
    montar({ ativa: 'canal' });

    expect(botao('Canal paralelo')).toHaveClass('ativo');
    expect(botao('Canal paralelo')).toHaveAttribute('aria-pressed', 'true');
    expect(botao('Linha de tendência')).not.toHaveClass('ativo');
  });

  it('o cursor é a ausência de ferramenta', async () => {
    const user = userEvent.setup();
    const { aoEscolher } = montar({ ativa: 'trend' });

    await user.click(botao('Cursor'));

    expect(aoEscolher).toHaveBeenCalledWith(null);
  });

  it('Esc larga a ferramenta', async () => {
    const user = userEvent.setup();
    const { aoEscolher } = montar({ ativa: 'retangulo_desenho' });

    await user.keyboard('{Escape}');

    expect(aoEscolher).toHaveBeenCalledWith(null);
  });

  it('os botões de ação não armam ferramenta — avisam a ação', async () => {
    const user = userEvent.setup();
    const { aoAgir, aoEscolher } = montar();

    await user.click(botao('Limpar desenhos'));
    await user.click(botao('Padrões do TradeZen'));

    expect(aoAgir).toHaveBeenCalledWith('limpar');
    expect(aoAgir).toHaveBeenCalledWith('templates');
    expect(aoEscolher).not.toHaveBeenCalled();
  });

  it('esconder e travar ficam acesos pelo estado, não pela ferramenta', () => {
    montar({ estado: { escondidos: true, travados: false } });

    expect(botao('Mostrar/esconder desenhos')).toHaveClass('ativo');
    expect(botao('Travar desenhos')).not.toHaveClass('ativo');
  });

  it('a dica aparece ao passar o mouse', async () => {
    const user = userEvent.setup();
    montar();
    expect(screen.queryByText('Linha vertical')).not.toBeInTheDocument();

    await user.hover(botao('Linha vertical'));

    expect(document.querySelector('.chart-tool-dica')).toHaveTextContent('Linha vertical');
  });

  it('a escolha volta no próximo acesso', () => {
    expect(lerFerramentaSalva()).toBeNull();

    guardarFerramenta('fibo');
    expect(lerFerramentaSalva()).toBe('fibo');

    // cursor não é ferramenta: volta como "nenhuma"
    guardarFerramenta(null);
    expect(lerFerramentaSalva()).toBeNull();
  });

  it('todo item tem rótulo e ícone — nada entra mudo na barra', () => {
    for (const grupo of GRUPOS_FERRAMENTAS) {
      for (const item of grupo) {
        expect(item.rotulo, JSON.stringify(item)).toBeTruthy();
        expect(item.icone, item.rotulo).toBeTruthy();
      }
    }
  });
});
