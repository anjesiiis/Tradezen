import { screen, waitFor } from '@testing-library/react';
import { createChart } from 'lightweight-charts';
import { renderApp } from './helpers.jsx';
import { CHAVE_LOCAL } from '../lib/graficosSalvos.js';
import { statusAtual, zerarStatus } from '../lib/statusSalvamento.js';

/**
 * Auto-save: nada de botão de salvar. O desenho vai pro navegador na hora
 * e pra conta quando a mão para, e o selo diz em que pé está.
 *
 * O caso que estes testes guardam é o silencioso: ABRIR um ativo também
 * dispara a gravação (restaurar o que estava salvo mexe no estado, e
 * mexer no estado chama a gravação). Sem comparar antes, o selo piscava
 * "Editando…" a cada ativo aberto e cada abertura virava um UPDATE de
 * nada no banco.
 */

const semear = (config) => localStorage.setItem(CHAVE_LOCAL, JSON.stringify(config));

describe('Auto-save dos desenhos', () => {
  beforeEach(() => { localStorage.clear(); zerarStatus(); });

  it('abrir um ativo com desenhos salvos não anuncia edição nenhuma', async () => {
    const fibo = { id: 'd1', tipo: 'fibo', pontos: [{ logical: 1, preco: 10 }, { logical: 5, preco: 20 }] };
    semear({ 'PETR4.SA': { tools: [], desenhos: [fibo] } });

    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 400));

    expect(statusAtual()).toBe('oculto');
  });

  it('abrir um ativo em branco também não anuncia nada', async () => {
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 400));

    expect(statusAtual()).toBe('oculto');
  });

  // O selo não pode roubar um clique de desenho
  it('o selo não intercepta ponteiro', async () => {
    renderApp('/ativo/PETR4.SA');
    await waitFor(() => expect(createChart).toHaveBeenCalled(), { timeout: 5000 });

    const area = document.querySelector('.ind-salvo-area');
    expect(area).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
