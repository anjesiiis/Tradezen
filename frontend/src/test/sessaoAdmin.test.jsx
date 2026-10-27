import { screen, waitFor } from '@testing-library/react';
import { renderApp } from './helpers.jsx';
import {
  JANELA_MS, consumirAvisoDeExpiracao, criarVigiaDeInatividade,
} from '../admin/sessaoAdmin.js';

const HORA = 60 * 60 * 1000;

describe('Sessão do admin — logout automático por inatividade', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it('a janela é de 12 horas', () => {
    expect(JANELA_MS).toBe(12 * HORA);
  });

  it('12h parado dispara o logout', () => {
    const aoExpirar = vi.fn();
    const vigia = criarVigiaDeInatividade({ aoExpirar });
    vigia.tocar();

    vi.advanceTimersByTime(12 * HORA - 1000);
    expect(aoExpirar).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(aoExpirar).toHaveBeenCalledTimes(1);
  });

  // é inatividade, não tempo de sessão: usar o painel adia o prazo
  it('usar o painel adia o prazo', () => {
    const aoExpirar = vi.fn();
    const vigia = criarVigiaDeInatividade({ aoExpirar });
    vigia.tocar();

    vi.advanceTimersByTime(11 * HORA);
    vigia.tocar();                        // mexeu no painel

    vi.advanceTimersByTime(11 * HORA);    // 22h desde a entrada, 11h paradas
    expect(aoExpirar).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2 * HORA);
    expect(aoExpirar).toHaveBeenCalledTimes(1);
  });

  // aba em segundo plano não está exposta na tela de ninguém
  it('pausar segura o relógio enquanto a aba está atrás', () => {
    const aoExpirar = vi.fn();
    const vigia = criarVigiaDeInatividade({ aoExpirar });
    vigia.tocar();

    vi.advanceTimersByTime(1 * HORA);
    vigia.pausar();
    vi.advanceTimersByTime(30 * HORA);
    expect(aoExpirar).not.toHaveBeenCalled();

    vigia.tocar();                        // aba voltou
    vi.advanceTimersByTime(11 * HORA);
    expect(aoExpirar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2 * HORA);
    expect(aoExpirar).toHaveBeenCalledTimes(1);
  });

  it('parar desarma de vez', () => {
    const aoExpirar = vi.fn();
    const vigia = criarVigiaDeInatividade({ aoExpirar });
    vigia.tocar();
    vigia.parar();

    vi.advanceTimersByTime(48 * HORA);
    expect(aoExpirar).not.toHaveBeenCalled();
  });

  it('o aviso de expiração é lido uma vez só', () => {
    localStorage.setItem('admin_expirou_por_inatividade', '1');

    expect(consumirAvisoDeExpiracao()).toBe(true);
    expect(consumirAvisoDeExpiracao()).toBe(false);
  });
});

describe('Admin — o portão', () => {
  beforeEach(() => localStorage.clear());

  it('com token, abre o painel', async () => {
    localStorage.setItem('admin_token', 'token-de-teste');

    renderApp('/admin/templates/bandeira-alta');

    expect(await screen.findByText('Nova marcação', undefined, { timeout: 5000 })).toBeInTheDocument();
  });

  // o bug que esta mudança conserta: antes, uma marca velha no
  // localStorage expulsava quem acabava de entrar com um link novo — e o
  // link, que é de uso único, ia junto
  it('quem volta depois de dias fora entra na hora', async () => {
    localStorage.setItem('admin_token', 'token-de-teste');
    localStorage.setItem('admin_ultima_atividade', String(Date.now() - 72 * HORA));

    renderApp('/admin/templates/bandeira-alta');

    expect(await screen.findByText('Nova marcação', undefined, { timeout: 5000 })).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem('admin_token')).toBe('token-de-teste'));
    expect(localStorage.getItem('admin_expirou_por_inatividade')).toBeNull();
  });
});
