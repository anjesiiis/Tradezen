import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './helpers.jsx';
import { VENDAS_CSS } from '../styles/vendasCss.js';

const abrir = async () => {
  renderApp('/pagina-de-vendas');
  await screen.findByText(/Pare de garimpar padrões manualmente/, undefined, { timeout: 5000 });
};

describe('Página de vendas', () => {
  it('abre em /pagina-de-vendas com as seções da oferta', async () => {
    await abrir();

    expect(screen.getByText('Sua central de análise técnica, do seu jeito.')).toBeInTheDocument();
    expect(screen.getByText('A vantagem operacional que faltava no seu arsenal.')).toBeInTheDocument();
    expect(screen.getByText('Três passos simples.')).toBeInTheDocument();
    expect(screen.getByText('Vantagem operacional por menos de R$ 2 por dia.')).toBeInTheDocument();
    expect(screen.getByText('49')).toBeInTheDocument();
  });

  it('não traz o header nem a navegação do app', async () => {
    await abrir();

    expect(document.querySelector('nav.nav')).toBeNull();
    expect(document.querySelector('.sb-item')).toBeNull();
  });

  it('os botões levam pro cadastro e pro login de verdade', async () => {
    const user = userEvent.setup();
    await abrir();

    await user.click(screen.getByRole('link', { name: 'Começar grátis' }));

    await waitFor(() => expect(window.location.pathname).toBe('/cadastro'));
  });

  it('o aviso de que não é recomendação está na página', async () => {
    await abrir();

    expect(screen.getByText(/NÃO é recomendação de investimento/)).toBeInTheDocument();
  });

  it('os 7 recursos do plano base aparecem', async () => {
    await abrir();

    expect(document.querySelectorAll('.lp-card')).toHaveLength(7);
  });

  it('os 3 estágios do alerta aparecem, cada um com sua cor', async () => {
    await abrir();

    const sinais = document.querySelectorAll('.lp-sinal');
    expect(sinais).toHaveLength(3);
    expect([...sinais].map(s => s.className)).toEqual([
      'lp-sinal formando', 'lp-sinal desenvolvendo', 'lp-sinal confirmado',
    ]);
  });
});

describe('Página de vendas — o botão que estava apagado', () => {
  // A regra do menu pintava QUALQUER <a> de cinza, inclusive os botões —
  // e como ela tem especificidade maior que a do botão, "Começar grátis"
  // saía cinza por cima do azul claro, quase invisível.
  it('a cor do menu não alcança os botões', () => {
    expect(VENDAS_CSS).toContain('.lp-nav a:not(.lp-btn){color:var(--fg-muted)');
    expect(VENDAS_CSS).not.toMatch(/\.lp-nav a\{color/);
  });

  it('o botão principal mantém a própria cor de texto', async () => {
    await abrir();

    const botao = screen.getByRole('link', { name: 'Começar grátis' });
    expect(botao).toHaveClass('lp-btn', 'lp-btn-primary');
    // a classe do menu não deve estar aplicada a ele
    expect(botao.className).not.toContain('lp-so-desktop');
  });
});

describe('Página de vendas — a cor dos títulos', () => {
  // O index.css tem `h1,h2{color:var(--text-h)}`, e regra de elemento
  // vence herança: sem a regra abaixo o título do hero saía quase preto
  // sobre o fundo escuro desta página, invisível.
  it('os títulos herdam a paleta da página, não a do app', () => {
    expect(VENDAS_CSS).toContain('.lp h1,.lp h2,.lp h3,.lp h4{color:inherit}');
  });

  // a primeira versão dessa regra incluía p/span/div e apagou os tons
  // secundários: tudo virou branco, sem hierarquia
  it('a regra alcança só os títulos, pra não achatar os textos secundários', () => {
    const regra = VENDAS_CSS.match(/\.lp h1[^{]*\{color:inherit\}/)[0];
    for (const tag of [' p', ' span', ' div', ' li']) {
      expect(regra.includes(tag), `a regra não pode alcançar${tag}`).toBe(false);
    }
  });

  it('o texto em gradiente sobrevive à regra dos títulos', () => {
    // .lp .lp-destaque (0,2,0) precisa vencer .lp h1 (0,1,1)
    expect(VENDAS_CSS).toContain('.lp .lp-destaque{color:transparent}');
  });
});

describe('Página de vendas — não vaza estilo pro resto do site', () => {
  it('todas as regras são escopadas em .lp', () => {
    const regras = VENDAS_CSS
      .replace(/\/\*[\s\S]*?\*\//g, '')          // tira comentários
      .split('}')
      .map(b => b.split('{')[0].trim())
      .filter(sel => sel && !sel.startsWith('@') && !sel.startsWith('/'));

    for (const sel of regras) {
      expect(sel.includes('.lp'), `seletor fora de escopo: ${sel}`).toBe(true);
    }
  });
});
