import { render } from '@testing-library/react';
import AnotacoesGrafico from '../admin/AnotacoesGrafico.jsx';

// O RETÂNGULO ESCURO PRESO NO GRÁFICO
// ===================================
//
// `.anotacao` tem fundo rgba(13,17,23,.92), borda, raio e sombra. Uma
// anotação SEM TEXTO, no modo de leitura, renderizava essa caixa vazia:
// 170x44px de retângulo escuro translúcido por cima do gráfico, sem
// texto, sem ✕ e sem canto de arrastar — nada que dissesse o que era, e
// nenhum jeito de tirar da frente.
//
// Vinham de templates salvos por versões antigas da tela, antes de o
// salvamento passar a descartar anotação vazia.
//
// Em EDIÇÃO ela continua aparecendo de propósito: lá é o passo
// intermediário de escrever uma, e tem ✕ pra apagar.

const pos = { x: 120, y: 90 };
const props = { paraPixel: () => pos, paraAncora: () => null };

const anotacao = (texto, id = 'a1') => ({
  id, ancora: { i: 10, preco: 5 }, texto, largura: 170, altura: 44,
});

describe('modo visualizar (somente leitura)', () => {
  it('anotação sem texto não desenha caixa nenhuma', () => {
    const { container } = render(
      <AnotacoesGrafico {...props} somenteLeitura valor={[anotacao('')]} />,
    );
    expect(container.querySelector('.anotacao')).toBeNull();
  });

  it('nem quando o texto é só espaço em branco', () => {
    for (const vazio of ['   ', '\n', '\t ', undefined, null]) {
      const { container } = render(
        <AnotacoesGrafico {...props} somenteLeitura valor={[anotacao(vazio)]} />,
      );
      expect(container.querySelector('.anotacao')).toBeNull();
    }
  });

  it('anotação COM texto continua aparecendo — não quebrei o que servia', () => {
    const { container, getByText } = render(
      <AnotacoesGrafico {...props} somenteLeitura valor={[anotacao('aqui o volume seca')]} />,
    );
    expect(container.querySelectorAll('.anotacao')).toHaveLength(1);
    expect(getByText('aqui o volume seca')).toBeInTheDocument();
  });

  it('entre várias, só as vazias desaparecem', () => {
    const { container } = render(
      <AnotacoesGrafico
        {...props}
        somenteLeitura
        valor={[anotacao('rompeu e voltou', 'a1'), anotacao('', 'a2'), anotacao('mastro', 'a3')]}
      />,
    );
    const caixas = container.querySelectorAll('.anotacao');
    expect(caixas).toHaveLength(2);
    expect([...caixas].map((c) => c.textContent)).toEqual(['rompeu e voltou', 'mastro']);
  });

  it('nenhuma caixa vazia sobra ao trocar de padrão três vezes', () => {
    // é a validação pedida: abrir um padrão, outro, outro
    const { container, rerender } = render(
      <AnotacoesGrafico {...props} somenteLeitura valor={[anotacao('', 'p1')]} />,
    );
    expect(container.querySelector('.anotacao')).toBeNull();

    rerender(<AnotacoesGrafico {...props} somenteLeitura valor={[anotacao('nota do #2', 'p2')]} />);
    expect(container.querySelectorAll('.anotacao')).toHaveLength(1);

    rerender(<AnotacoesGrafico {...props} somenteLeitura valor={[anotacao('', 'p3')]} />);
    expect(container.querySelector('.anotacao')).toBeNull();
    // e nada ficou preso do padrão anterior
    expect(container.textContent).toBe('');
  });
});

describe('modo edição — a anotação vazia tem que continuar lá', () => {
  it('aparece, com o texto de ajuda e o botão de excluir', () => {
    const { container, getByText } = render(
      <AnotacoesGrafico {...props} valor={[anotacao('')]} aoMudar={vi.fn()} />,
    );
    expect(container.querySelectorAll('.anotacao')).toHaveLength(1);
    expect(getByText('duplo clique para escrever')).toBeInTheDocument();
    expect(container.querySelector('.anotacao-x')).not.toBeNull();
    expect(container.querySelector('.anotacao-canto')).not.toBeNull();
  });

  it('dá pra apagar a vazia que veio do banco', async () => {
    const aoMudar = vi.fn();
    const { container } = render(
      <AnotacoesGrafico {...props} valor={[anotacao('')]} aoMudar={aoMudar} />,
    );
    container.querySelector('.anotacao-x').click();
    expect(aoMudar).toHaveBeenCalledWith([]);
  });
});
