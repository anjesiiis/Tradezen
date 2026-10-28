import { screen, waitFor } from '@testing-library/react';
import { createChart } from 'lightweight-charts';
import { renderApp } from './helpers.jsx';
import { CHAVE_LOCAL } from '../lib/graficosSalvos.js';

/**
 * O que a pessoa monta no gráfico tem que sobreviver SEM conta.
 *
 * A gravação e a restauração exigiam `user`: quem não tinha conta perdia
 * indicadores e desenhos ao trocar de ativo, e nem o navegador guardava.
 * Pior, em silêncio — a subida do trabalho de visitante pra conta nova,
 * no primeiro login, nunca achava nada pra subir, porque nada tinha sido
 * gravado. Medido no navegador: tradezen-ativo-config ficava {} depois de
 * desenhar um Fibonacci inteiro.
 */

const guardado = () => JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '{}');

const semear = (config) => localStorage.setItem(CHAVE_LOCAL, JSON.stringify(config));

describe('Gráfico de quem não tem conta', () => {
  beforeEach(() => localStorage.clear());

  it('restaura os indicadores salvos sem pedir login', async () => {
    semear({ 'PETR4.SA': { tools: ['sma20', 'rsi'], desenhos: [] } });

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });

    // O contador ao lado de "Indicadores" é o que mostra quantos voltaram
    const botao = await screen.findByText(/Indicadores/, undefined, { timeout: 5000 });
    await waitFor(() => expect(botao.closest('button')).toHaveTextContent('2'));
  });

  it('guarda os desenhos salvos daquele ativo, e não os de outro', async () => {
    const fibo = { id: 'd1', tipo: 'fibo', pontos: [{ logical: 1, preco: 10 }, { logical: 5, preco: 20 }] };
    semear({
      'PETR4.SA': { tools: [], desenhos: [fibo] },
      'VALE3.SA': { tools: [], desenhos: [] },
    });

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });

    // o que estava salvo continua salvo, e o ativo vizinho não foi tocado
    await waitFor(() => expect(guardado()['PETR4.SA'].desenhos).toHaveLength(1));
    expect(guardado()['VALE3.SA'].desenhos).toHaveLength(0);
  });

  // Sem isto, cada ativo só de passagem deixaria uma linha vazia no banco
  // de quem tem conta — e a lista de "gráficos salvos" viraria a lista de
  // tudo o que a pessoa abriu.
  it('ativo aberto e deixado em branco não vira registro', async () => {
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 300));

    expect(guardado()['PETR4.SA']).toBeUndefined();
  });
});
