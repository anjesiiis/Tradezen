import { screen, waitFor } from '@testing-library/react';
import { renderApp } from './helpers.jsx';

// A landing (página inicial) nunca pode aparecer no lugar do painel: era
// exatamente esse o bug — link de acesso expirado caía nela, calado.
const TEXTO_LANDING = /VEJA PADRÕES|Explorar TradeZen|Mercado/i;

function naoCaiuNaPaginaInicial() {
  expect(document.querySelector('.abertura')).toBeNull();
  expect(document.querySelector('.abm')).toBeNull();
  expect(screen.queryByText('Página não encontrada')).not.toBeInTheDocument();
}

describe('Rotas do admin', () => {
  it('/admin/templates/ (barra no fim) não cai no 404 do site', async () => {
    renderApp('/admin/templates/');

    await waitFor(() => expect(document.body.textContent).not.toMatch(TEXTO_LANDING));
    naoCaiuNaPaginaInicial();
  });

  it('/admin (sem sub-rota) abre o login do admin', async () => {
    renderApp('/admin');

    expect(await screen.findByText(/Acesso restrito/i)).toBeInTheDocument();
    naoCaiuNaPaginaInicial();
  });

  it('/admin/login abre o login do admin', async () => {
    renderApp('/admin/login');

    expect(await screen.findByText(/Acesso restrito/i)).toBeInTheDocument();
  });
});

describe('Retorno do link de acesso do admin', () => {
  it('link expirado na raiz do site avisa, em vez de mostrar a página inicial', async () => {
    renderApp('/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');

    expect(await screen.findByText(/expirou ou já foi usado/i)).toBeInTheDocument();
    expect(screen.getByText(/Pedir novo link/i)).toBeInTheDocument();
    naoCaiuNaPaginaInicial();
  });

  it('formato ?code= na raiz avisa, em vez de mostrar a página inicial', async () => {
    renderApp('/?code=abc123');

    expect(await screen.findByText(/Não foi possível concluir o acesso/i)).toBeInTheDocument();
    naoCaiuNaPaginaInicial();
  });

  it('token válido no hash guarda o acesso e vai pro painel', async () => {
    const replace = vi.fn();
    const local = window.location;
    delete window.location;
    window.location = { ...local, replace, hash: '#access_token=tok123&type=magiclink', search: '' };

    renderApp('/#access_token=tok123&type=magiclink');

    await waitFor(() => expect(localStorage.getItem('admin_token')).toBe('tok123'));
    expect(replace).toHaveBeenCalledWith('/admin/templates/topo-duplo');

    window.location = local;
  });

  it('link de troca de senha do usuário não é tratado como admin', async () => {
    renderApp('/#access_token=tok123&type=recovery');

    await waitFor(() => expect(document.querySelector('nav.nav, .abertura, .abm')).not.toBeNull());
    expect(screen.queryByText(/Pedir novo link/i)).not.toBeInTheDocument();
  });
});
