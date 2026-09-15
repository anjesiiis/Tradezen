import { render } from '@testing-library/react';
import App from '../App.jsx';

export const LARGURA_MOBILE = 375;
export const LARGURA_DESKTOP = 1280;

export function definirTela(largura) {
  window.innerWidth = largura;
  window.dispatchEvent(new Event('resize'));
}

// Renderiza o app inteiro (BrowserRouter + AuthProvider) já na rota
// pedida — do mesmo jeito que o usuário chega nela pelo navegador.
export function renderApp(rota = '/', { mobile = false } = {}) {
  definirTela(mobile ? LARGURA_MOBILE : LARGURA_DESKTOP);
  window.history.pushState({}, '', rota);
  return render(<App />);
}
