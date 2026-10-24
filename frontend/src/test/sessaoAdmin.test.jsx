import { screen, waitFor } from '@testing-library/react';
import { renderApp } from './helpers.jsx';
import {
  JANELA_MS, consumirAvisoDeExpiracao, marcarAtividade, sessaoExpirou, tempoRestante,
} from '../admin/sessaoAdmin.js';

const HORA = 60 * 60 * 1000;

describe('Sessão do admin — expiração por inatividade', () => {
  beforeEach(() => localStorage.clear());

  it('a janela é de 12 horas', () => {
    expect(JANELA_MS).toBe(12 * HORA);
  });

  // sem marca é primeiro acesso (ou storage bloqueado): expulsar quem
  // acabou de entrar seria pior que o problema
  it('sem marca de atividade, não expira', () => {
    expect(sessaoExpirou()).toBe(false);
    expect(tempoRestante()).toBeNull();
  });

  it('11h59 sem uso ainda vale; 12h01 não', () => {
    const agora = Date.now();
    marcarAtividade(agora);

    expect(sessaoExpirou(agora + 11 * HORA)).toBe(false);
    expect(sessaoExpirou(agora + 12 * HORA - 60_000)).toBe(false);
    expect(sessaoExpirou(agora + 12 * HORA + 60_000)).toBe(true);
  });

  // é inatividade, não tempo de sessão: usar o painel adia o prazo
  it('usar o painel adia o prazo', () => {
    const agora = Date.now();
    marcarAtividade(agora);
    expect(sessaoExpirou(agora + 11 * HORA)).toBe(false);

    marcarAtividade(agora + 11 * HORA);   // mexeu no painel

    expect(sessaoExpirou(agora + 13 * HORA)).toBe(false);   // 2h desde o último uso
    expect(sessaoExpirou(agora + 24 * HORA)).toBe(true);    // 13h desde o último uso
  });

  it('não grava a cada clique — um minuto de resolução basta', () => {
    const agora = Date.now();
    marcarAtividade(agora);
    const marca = localStorage.getItem('admin_ultima_atividade');

    marcarAtividade(agora + 5_000);   // clique logo em seguida
    expect(localStorage.getItem('admin_ultima_atividade')).toBe(marca);

    marcarAtividade(agora + 61_000);
    expect(localStorage.getItem('admin_ultima_atividade')).not.toBe(marca);
  });

  it('o aviso de expiração é lido uma vez só', () => {
    localStorage.setItem('admin_expirou_por_inatividade', '1');

    expect(consumirAvisoDeExpiracao()).toBe(true);
    expect(consumirAvisoDeExpiracao()).toBe(false);
  });
});

describe('Admin — o portão', () => {
  beforeEach(() => localStorage.clear());

  it('com sessão recente, abre o painel', async () => {
    localStorage.setItem('admin_token', 'token-de-teste');
    marcarAtividade(Date.now());

    renderApp('/admin/templates/bandeira-alta');

    expect(await screen.findByText('Nova marcação', undefined, { timeout: 5000 })).toBeInTheDocument();
  });

  it('depois de 12h paradas, o painel não abre', async () => {
    localStorage.setItem('admin_token', 'token-de-teste');
    marcarAtividade(Date.now() - 13 * HORA);

    renderApp('/admin/templates/bandeira-alta');

    // some o token e marca o aviso — o redirecionamento em si é do
    // navegador (window.location.replace), que o jsdom não executa
    await waitFor(() => expect(localStorage.getItem('admin_token')).toBeNull());
    expect(localStorage.getItem('admin_expirou_por_inatividade')).toBe('1');
    expect(screen.queryByText('Nova marcação')).not.toBeInTheDocument();
  });
});
