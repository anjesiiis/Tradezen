import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnotacoesGrafico from '../admin/AnotacoesGrafico.jsx';

// Conversores falsos no lugar do gráfico: 10px por candle na horizontal,
// e preço = 100 - y na vertical.
const paraPixel = ({ i, preco }) => ({ x: i * 10, y: 100 - preco });
const paraAncora = (x, y) => ({ i: Math.round(x / 10), preco: 100 - y });

function montar(props = {}) {
  const aoSairDoModo = vi.fn();
  const utils = render(
    <AnotacoesGrafico modo paraPixel={paraPixel} paraAncora={paraAncora} versao={0} aoSairDoModo={aoSairDoModo} {...props} />
  );
  const area = document.querySelector('.anotacoes');
  return { ...utils, area, aoSairDoModo };
}

const anotacoes = () => [...document.querySelectorAll('.anotacao')];

describe('Anotações no gráfico', () => {
  it('fora do modo texto, clicar no gráfico não cria nada', () => {
    const { area } = montar({ modo: false });

    fireEvent.click(area, { clientX: 120, clientY: 60 });

    expect(anotacoes()).toHaveLength(0);
  });

  it('no modo texto, um clique cria a anotação já pronta pra escrever', async () => {
    const user = userEvent.setup();
    const { area, aoSairDoModo } = montar();

    fireEvent.click(area, { clientX: 120, clientY: 60 });

    const campo = screen.getByPlaceholderText('escreva aqui');
    expect(campo.tagName).toBe('TEXTAREA');
    // sai do modo sozinho: o próximo clique no gráfico volta a marcar ponto
    expect(aoSairDoModo).toHaveBeenCalled();

    await user.type(campo, 'volume seca aqui');
    expect(campo).toHaveValue('volume seca aqui');
  });

  it('Enter fixa o texto como etiqueta no gráfico', async () => {
    const user = userEvent.setup();
    const { area } = montar();
    fireEvent.click(area, { clientX: 100, clientY: 50 });

    await user.type(screen.getByPlaceholderText('escreva aqui'), 'rompeu e voltou{Enter}');

    expect(screen.queryByPlaceholderText('escreva aqui')).not.toBeInTheDocument();
    expect(screen.getByText('rompeu e voltou')).toBeInTheDocument();
  });

  it('duplo clique volta a editar', async () => {
    const user = userEvent.setup();
    const { area } = montar();
    fireEvent.click(area, { clientX: 100, clientY: 50 });
    await user.type(screen.getByPlaceholderText('escreva aqui'), 'primeiro{Enter}');

    await user.dblClick(screen.getByText('primeiro'));

    expect(screen.getByRole('textbox')).toHaveValue('primeiro');
  });

  it('fica onde foi criada, convertendo a âncora em pixels', () => {
    const { area } = montar();

    fireEvent.click(area, { clientX: 120, clientY: 60 });

    // x=120 → candle 12 → 120px | y=60 → preço 40 → 100-40 = 60px
    expect(anotacoes()[0]).toHaveStyle({ left: '120px', top: '60px' });
  });

  it('dá pra criar várias e excluir uma pelo ✕', async () => {
    const user = userEvent.setup();
    const { area } = montar({ modo: true });

    fireEvent.click(area, { clientX: 100, clientY: 50 });
    await user.type(screen.getByPlaceholderText('escreva aqui'), 'uma{Enter}');
    fireEvent.click(area, { clientX: 200, clientY: 70 });
    await user.type(screen.getByPlaceholderText('escreva aqui'), 'duas{Enter}');
    expect(anotacoes()).toHaveLength(2);

    await user.click(within(anotacoes()[0]).getByTitle('Excluir anotação'));

    expect(anotacoes()).toHaveLength(1);
    expect(screen.queryByText('uma')).not.toBeInTheDocument();
    expect(screen.getByText('duas')).toBeInTheDocument();
  });

  it('arrastar o corpo muda a posição', async () => {
    const user = userEvent.setup();
    const { area } = montar();
    fireEvent.click(area, { clientX: 100, clientY: 50 });
    await user.type(screen.getByPlaceholderText('escreva aqui'), 'nota{Enter}');
    expect(anotacoes()[0]).toHaveStyle({ left: '100px' });

    fireEvent.pointerDown(screen.getByText('nota'), { clientX: 100, clientY: 50 });
    fireEvent.pointerMove(area, { clientX: 250, clientY: 80 });
    fireEvent.pointerUp(area);

    expect(anotacoes()[0]).toHaveStyle({ left: '250px', top: '80px' });
  });

  it('arrastar o canto redimensiona', async () => {
    const user = userEvent.setup();
    const { area } = montar();
    fireEvent.click(area, { clientX: 100, clientY: 50 });
    await user.type(screen.getByPlaceholderText('escreva aqui'), 'nota{Enter}');
    const antes = anotacoes()[0].getBoundingClientRect
      ? getComputedStyle(anotacoes()[0]).width
      : null;
    expect(antes).toBe('170px');

    fireEvent.pointerDown(within(anotacoes()[0]).getByTitle('Arraste para redimensionar'), { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(area, { clientX: 60, clientY: 20 });
    fireEvent.pointerUp(area);

    expect(anotacoes()[0]).toHaveStyle({ width: '230px', height: '64px' });
  });

  it('não encolhe abaixo do tamanho mínimo', async () => {
    const user = userEvent.setup();
    const { area } = montar();
    fireEvent.click(area, { clientX: 100, clientY: 50 });
    await user.type(screen.getByPlaceholderText('escreva aqui'), 'nota{Enter}');

    fireEvent.pointerDown(within(anotacoes()[0]).getByTitle('Arraste para redimensionar'), { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(area, { clientX: -500, clientY: -500 });
    fireEvent.pointerUp(area);

    expect(anotacoes()[0]).toHaveStyle({ width: '80px', height: '30px' });
  });

  it('some da tela quando a âncora sai da parte visível do gráfico', async () => {
    const user = userEvent.setup();
    const { area, rerender } = montar();
    fireEvent.click(area, { clientX: 100, clientY: 50 });
    await user.type(screen.getByPlaceholderText('escreva aqui'), 'nota{Enter}');
    expect(anotacoes()).toHaveLength(1);

    rerender(
      <AnotacoesGrafico modo={false} paraPixel={() => null} paraAncora={paraAncora} versao={1} />
    );

    expect(anotacoes()).toHaveLength(0);
  });
});
