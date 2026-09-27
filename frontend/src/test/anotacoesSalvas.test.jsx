import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnotacoesGrafico from '../admin/AnotacoesGrafico.jsx';
import { anotacoesParaSalvar, janelaDoPadrao } from '../admin/janela.js';
import { converterAnotacoes } from '../admin/lampadas.js';

const DIA = 86400000;
const candles = (n, inicio = 0) =>
  Array.from({ length: n }, (_, i) => ({ timestamp: (inicio + i) * DIA, open: 1, high: 2, low: 0, close: 1 }));

const etiqueta = (texto, i, preco = 10) => ({ texto, ancora: { i, preco }, largura: 170, altura: 44 });

describe('Etiquetas salvas junto com o template', () => {
  describe('janelaDoPadrao', () => {
    const contexto = candles(100);
    const pontos = { a: { i: 40, preco: 10 }, b: { i: 50, preco: 12 } };

    it('reindexa a âncora pro mesmo recorte dos pontos', () => {
      const { candles: recorte, pontosAjustados, anotacoesAjustadas } =
        janelaDoPadrao(contexto, pontos, [etiqueta('volume seca', 45)]);

      // janela = 25..65 (15 de folga dos dois lados)
      expect(recorte).toHaveLength(41);
      expect(pontosAjustados.a.i).toBe(15);
      expect(anotacoesAjustadas[0].ancora.i).toBe(20);
      // e o candle apontado continua sendo o mesmo
      expect(recorte[20].timestamp).toBe(contexto[45].timestamp);
    });

    it('descarta etiqueta vazia e etiqueta fora da janela', () => {
      const { anotacoesAjustadas } = janelaDoPadrao(contexto, pontos, [
        etiqueta('   ', 45),
        etiqueta('longe demais', 90),
        etiqueta('  fica  ', 45),
      ]);

      expect(anotacoesAjustadas).toHaveLength(1);
      expect(anotacoesAjustadas[0].texto).toBe('fica');
    });

    it('sem etiquetas, devolve lista vazia', () => {
      expect(janelaDoPadrao(contexto, pontos).anotacoesAjustadas).toEqual([]);
    });
  });

  describe('anotacoesParaSalvar', () => {
    it('tira as vazias e o espaço em volta', () => {
      expect(anotacoesParaSalvar([etiqueta('  rompeu  ', 3), etiqueta('', 4)]))
        .toEqual([{ texto: 'rompeu', ancora: { i: 3, preco: 10 }, largura: 170, altura: 44 }]);
    });

    it('aguenta undefined', () => {
      expect(anotacoesParaSalvar(undefined)).toEqual([]);
    });
  });

  describe('converterAnotacoes', () => {
    it('reancora a etiqueta no candle equivalente do gráfico aberto', () => {
      // template salvo com os candles dos dias 10..19
      const salvo = { candles: candles(10, 10), anotacoes: [etiqueta('aqui', 3)] };
      // na tela, o gráfico começa no dia 0 — o dia 13 é o índice 13
      const convertidas = converterAnotacoes(salvo, candles(40));

      expect(convertidas[0].ancora.i).toBe(13);
      expect(convertidas[0].texto).toBe('aqui');
    });

    it('template sem etiquetas não vira nada', () => {
      expect(converterAnotacoes({ candles: candles(10), anotacoes: [] }, candles(10))).toEqual([]);
      expect(converterAnotacoes({ candles: candles(10) }, candles(10))).toEqual([]);
    });
  });

  describe('AnotacoesGrafico controlado pelo pai', () => {
    const paraPixel = ({ i, preco }) => ({ x: i * 10, y: 100 - preco });
    const paraAncora = (x, y) => ({ i: Math.round(x / 10), preco: 100 - y });

    function montar(props = {}) {
      const aoMudar = vi.fn();
      render(<AnotacoesGrafico modo paraPixel={paraPixel} paraAncora={paraAncora} versao={0} aoMudar={aoMudar} {...props} />);
      return { aoMudar, area: document.querySelector('.anotacoes') };
    }

    it('avisa o pai quando uma etiqueta é criada', () => {
      const { aoMudar, area } = montar({ valor: [] });

      fireEvent.click(area, { clientX: 120, clientY: 60 });

      expect(aoMudar).toHaveBeenCalledTimes(1);
      const lista = aoMudar.mock.calls[0][0];
      expect(lista).toHaveLength(1);
      expect(lista[0].ancora).toEqual({ i: 12, preco: 40 });
    });

    it('desenha o que vem de fora (template reaberto)', () => {
      montar({ valor: [{ id: 'x', texto: 'rompeu e voltou', ancora: { i: 5, preco: 50 }, largura: 170, altura: 44 }] });

      expect(screen.getByText('rompeu e voltou')).toBeInTheDocument();
    });

    it('somente leitura: mostra o texto, não deixa apagar nem criar', async () => {
      const user = userEvent.setup();
      const { aoMudar, area } = montar({
        somenteLeitura: true,
        valor: [{ id: 'x', texto: 'padrão salvo', ancora: { i: 5, preco: 50 }, largura: 170, altura: 44 }],
      });

      expect(screen.getByText('padrão salvo')).toBeInTheDocument();
      expect(screen.queryByTitle('Excluir anotação')).not.toBeInTheDocument();

      await user.dblClick(screen.getByText('padrão salvo'));
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

      fireEvent.click(area, { clientX: 300, clientY: 20 });
      expect(aoMudar).not.toHaveBeenCalled();
    });
  });
});
