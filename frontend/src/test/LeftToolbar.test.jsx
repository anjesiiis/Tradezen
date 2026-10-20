import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeftToolbar from '../components/chart/LeftToolbar.jsx';
import { GRUPOS_FERRAMENTAS, guardarFerramenta, lerFerramentaSalva } from '../components/chart/ferramentasGrafico.js';

// A barra só ESCOLHE a ferramenta; quem desenha é o CandleChart. Por isso
// os testes olham o que ela emite e o que ela acende, não o gráfico.
function montar(props = {}) {
  const aoEscolher = vi.fn();
  const utils = render(<LeftToolbar ativa={null} aoEscolher={aoEscolher} {...props} />);
  return { ...utils, aoEscolher };
}

const botao = (nome) => screen.getByRole('button', { name: nome });

// A barra tinha vinte ícones e o dono pediu seis. Esta lista é o contrato:
// se alguém acrescentar ferramenta aqui sem pedido, o teste reclama.
const AS_SEIS = [
  'Linha de tendência', 'Linha horizontal',
  'Retângulo', 'Canal paralelo',
  'Fibonacci — retração', 'Texto',
];

describe('Barra de ferramentas do gráfico', () => {
  beforeEach(() => localStorage.clear());

  it('mostra exatamente as seis ferramentas de desenho', () => {
    montar();

    expect(document.querySelectorAll('.chart-tool')).toHaveLength(6);
    for (const nome of AS_SEIS) expect(botao(nome)).toBeInTheDocument();
  });

  // o que agia na hora (limpar, esconder, travar, régua) foi pra barra de
  // cima; cursor e engrenagem saíram de vez
  it('não tem mais botão de ação nem de cursor', () => {
    montar();

    for (const nome of ['Cursor', 'Limpar desenhos', 'Configurações do gráfico',
      'Padrões do TradeZen', 'Travar desenhos', 'Mostrar/esconder desenhos',
      'Régua — medir variação', 'Linha vertical', 'Triângulo', 'Fibonacci — extensão']) {
      expect(screen.queryByRole('button', { name: nome })).not.toBeInTheDocument();
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

  // sem botão de cursor, é assim que se larga a ferramenta pelo mouse
  it('segundo clique na ferramenta acesa larga ela', async () => {
    const user = userEvent.setup();
    const { aoEscolher } = montar({ ativa: 'trend' });

    await user.click(botao('Linha de tendência'));

    expect(aoEscolher).toHaveBeenCalledWith(null);
  });

  it('Esc larga a ferramenta', async () => {
    const user = userEvent.setup();
    const { aoEscolher } = montar({ ativa: 'retangulo_desenho' });

    await user.keyboard('{Escape}');

    expect(aoEscolher).toHaveBeenCalledWith(null);
  });

  it('o Fibonacci é desenhado em SVG, não é mais o Φ', () => {
    montar();

    expect(botao('Fibonacci — retração').querySelector('svg')).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/Φ|𝝋/);
  });

  it('a dica aparece ao passar o mouse', async () => {
    const user = userEvent.setup();
    montar();
    expect(screen.queryByText('Canal paralelo')).not.toBeInTheDocument();

    await user.hover(botao('Canal paralelo'));

    expect(document.querySelector('.chart-tool-dica')).toHaveTextContent('Canal paralelo');
  });

  it('a escolha volta no próximo acesso', () => {
    expect(lerFerramentaSalva()).toBeNull();

    guardarFerramenta('fibo');
    expect(lerFerramentaSalva()).toBe('fibo');

    // cursor não é ferramenta: volta como "nenhuma"
    guardarFerramenta(null);
    expect(lerFerramentaSalva()).toBeNull();
  });

  it('todo item tem id, rótulo e ícone — nada entra mudo na barra', () => {
    for (const grupo of GRUPOS_FERRAMENTAS) {
      for (const item of grupo) {
        expect(item.id, JSON.stringify(item)).toBeTruthy();
        expect(item.rotulo, JSON.stringify(item)).toBeTruthy();
        expect(item.icone, item.rotulo).toBeTruthy();
      }
    }
  });
});
