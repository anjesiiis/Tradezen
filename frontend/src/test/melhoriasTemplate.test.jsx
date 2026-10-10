import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BotoesPeriodo from '../admin/BotoesPeriodo.jsx';
import { comContextoLargo } from '../admin/contextoTemplate.js';
import { PERIODOS_RAPIDOS } from '../lib/periodosGrafico.js';

const DIA = 86400000;
const candles = (n, inicio = 0) =>
  Array.from({ length: n }, (_, i) => ({ timestamp: (inicio + i) * DIA, fechamento: 10 + i }));

describe('Botões de período', () => {
  it('mostra os atalhos e marca o escolhido', () => {
    render(<BotoesPeriodo valor="3mo" aoEscolher={vi.fn()} />);

    expect(PERIODOS_RAPIDOS.map((p) => p.rotulo)).toEqual(['1M', '3M', '6M', '1A', '2A', '3A', '5A']);
    // o valor é o que o backend entende (ver PeriodoAtivo em main.py)
    expect(PERIODOS_RAPIDOS.map((p) => p.valor)).toEqual(['1mo', '3mo', '6mo', '1y', '2y', '3y', '5y']);
    expect(screen.getByRole('button', { name: '3M' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '1A' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicar escolhe o período correspondente', async () => {
    const user = userEvent.setup();
    const aoEscolher = vi.fn();
    render(<BotoesPeriodo valor="3mo" aoEscolher={aoEscolher} />);

    await user.click(screen.getByRole('button', { name: '6M' }));
    expect(aoEscolher).toHaveBeenCalledWith('6mo');

    // 2A e 3A preenchem o salto que havia entre 1 e 5 anos
    await user.click(screen.getByRole('button', { name: '2A' }));
    expect(aoEscolher).toHaveBeenCalledWith('2y');
    await user.click(screen.getByRole('button', { name: '3A' }));
    expect(aoEscolher).toHaveBeenCalledWith('3y');
  });

  it('enquanto carrega, não aceita outro clique', async () => {
    const user = userEvent.setup();
    const aoEscolher = vi.fn();
    render(<BotoesPeriodo valor="3mo" aoEscolher={aoEscolher} desabilitado />);

    await user.click(screen.getByRole('button', { name: '1A' }));

    expect(aoEscolher).not.toHaveBeenCalled();
  });
});

describe('Abrir template salvo com contexto', () => {
  // o template guarda o recorte estreito (candles) e o histórico que
  // estava carregado (candles_contexto)
  const template = {
    candles: candles(10, 50),              // dias 50..59
    candles_contexto: candles(200),        // dias 0..199
    pontos: { topo1: { i: 2, preco: 30 }, topo2: { i: 7, preco: 31 } },
    anotacoes: [{ texto: 'aqui', ancora: { i: 5, preco: 29 }, largura: 170, altura: 44 }],
  };

  it('troca o recorte curto pelo histórico inteiro', () => {
    const aberto = comContextoLargo(template);

    expect(aberto.candles).toHaveLength(200);
  });

  it('os pontos continuam no mesmo candle, com o índice do histórico', () => {
    const aberto = comContextoLargo(template);

    // dia 52 no recorte era o índice 2; no contexto é o 52
    expect(aberto.pontos.topo1.i).toBe(52);
    expect(aberto.pontos.topo2.i).toBe(57);
    expect(aberto.candles[52].timestamp).toBe(template.candles[2].timestamp);
  });

  it('as etiquetas acompanham', () => {
    expect(comContextoLargo(template).anotacoes[0].ancora.i).toBe(55);
  });

  it('template sem contexto guardado fica como está', () => {
    const semContexto = { candles: candles(10, 50), pontos: { topo1: { i: 2, preco: 30 } } };

    expect(comContextoLargo(semContexto)).toBe(semContexto);
  });

  it('contexto menor que o recorte também fica como está', () => {
    const estranho = { ...template, candles_contexto: candles(3) };

    expect(comContextoLargo(estranho)).toBe(estranho);
  });
});
