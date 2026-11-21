import { screen, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { ehRetornoDeRecuperacao, precisaResgatarRecuperacao } from '../auth/retornoAuth.js';

describe('ehRetornoDeRecuperacao', () => {
  it('reconhece o formato de fragmento (#access_token=...&type=recovery)', () => {
    expect(ehRetornoDeRecuperacao('#access_token=abc&type=recovery', '')).toBe(true);
  });

  it('reconhece o formato de verificação na query (?token_hash=...&type=recovery)', () => {
    expect(ehRetornoDeRecuperacao('', '?token_hash=abc&type=recovery')).toBe(true);
  });

  it('aceita o fragmento sem o # na frente', () => {
    expect(ehRetornoDeRecuperacao('type=recovery', '')).toBe(true);
  });

  it('NÃO confunde com magic link', () => {
    expect(ehRetornoDeRecuperacao('#access_token=abc&type=magiclink', '')).toBe(false);
  });

  it('NÃO confunde com confirmação de cadastro', () => {
    expect(ehRetornoDeRecuperacao('#access_token=abc&type=signup', '')).toBe(false);
  });

  it('um ?code= pelado não é tratado como recuperação — nele não há como saber', () => {
    expect(ehRetornoDeRecuperacao('', '?code=abc123')).toBe(false);
  });

  it('URL limpa não é retorno de nada', () => {
    expect(ehRetornoDeRecuperacao('', '')).toBe(false);
    expect(ehRetornoDeRecuperacao(undefined, undefined)).toBe(false);
  });
});

describe('precisaResgatarRecuperacao', () => {
  const HASH = '#access_token=abc&refresh_token=def&type=recovery';

  it('resgata o token que caiu na raiz do site (o bug do link que vai pra home)', () => {
    expect(precisaResgatarRecuperacao('/', HASH, '')).toBe(true);
  });

  it('resgata em qualquer outra rota do app', () => {
    expect(precisaResgatarRecuperacao('/mercados', HASH, '')).toBe(true);
    expect(precisaResgatarRecuperacao('/ativo/PETR4.SA', HASH, '')).toBe(true);
  });

  it('NÃO mexe quando já está no destino certo', () => {
    expect(precisaResgatarRecuperacao('/redefinir-senha', HASH, '')).toBe(false);
  });

  it('NÃO sequestra /recuperar-senha — senão "Pedir novo link" entra em laço', () => {
    expect(precisaResgatarRecuperacao('/recuperar-senha', HASH, '')).toBe(false);
  });

  it('NÃO sequestra login, cadastro, callback nem admin', () => {
    for (const rota of ['/login', '/cadastro', '/auth/callback', '/admin/templates']) {
      expect(precisaResgatarRecuperacao(rota, HASH, '')).toBe(false);
    }
  });

  it('link expirado (#error=...) sem type=recovery não dispara resgate', () => {
    const erro = '#error=access_denied&error_code=otp_expired';
    expect(precisaResgatarRecuperacao('/', erro, '')).toBe(false);
  });

  it('sem marca de recuperação, nenhuma rota é desviada', () => {
    expect(precisaResgatarRecuperacao('/', '', '')).toBe(false);
    expect(precisaResgatarRecuperacao('/mercados', '#access_token=abc&type=magiclink', '')).toBe(false);
  });
});

// Um teste de integração só: o ferrolho `recuperacaoResgatada` vive no
// módulo do App e vale uma vez por carga de página, de propósito. Um
// segundo caso no mesmo arquivo compartilharia o módulo já marcado.
describe('App: link de recuperação que cai na raiz', () => {
  it('leva pro formulário de senha nova levando o token junto', async () => {
    const { default: App } = await import('../App.jsx');
    window.history.pushState({}, '', '/#access_token=abc&refresh_token=def&type=recovery');
    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/redefinir-senha'));
    // o fragmento tem que sobreviver ao desvio: é onde vem o token
    expect(window.location.hash).toContain('type=recovery');
    expect(await screen.findByText(/Confirmando o link/i)).toBeInTheDocument();
  });
});
