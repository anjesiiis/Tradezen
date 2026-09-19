import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SkeletonGraficoArea, SkeletonGraficoLinha, SkeletonPagina, SkeletonSecao, SkeletonValor } from '../components/Skeleton.jsx';
import { renderApp, definirTela, LARGURA_DESKTOP, LARGURA_MOBILE } from './helpers.jsx';

const ROTAS = ['/', '/mercados', '/ativo/PETR4.SA', '/login', '/cadastro', '/recuperar-senha', '/admin/templates'];

function semTextoDeCarregamento(container) {
  expect(container).not.toHaveTextContent(/carregando/i);
  expect(container.textContent.trim()).toBe('');
}

describe.each([
  ['mobile', LARGURA_MOBILE],
  ['desktop', LARGURA_DESKTOP],
])('Skeleton de página (%s)', (_, largura) => {
  it.each(ROTAS)('%s: blocos de skeleton, sem nenhum texto', (rota) => {
    definirTela(largura);
    const { container } = render(
      <MemoryRouter initialEntries={[rota]}>
        <SkeletonPagina />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.sk').length).toBeGreaterThan(5);
    semTextoDeCarregamento(container);
  });
});

describe('Skeletons de seção e de componentes', () => {
  it.each([
    ['seção do gráfico', <SkeletonSecao tipo="grafico" mobile />],
    ['seção do painel (mobile)', <SkeletonSecao tipo="painel" mobile />],
    ['seção do painel (desktop)', <SkeletonSecao tipo="painel" mobile={false} />],
    ['área de candles', <SkeletonGraficoArea />],
    ['gráfico de linha', <SkeletonGraficoLinha />],
    ['valor do card', <SkeletonValor />],
  ])('%s: skeleton sem texto', (_, elemento) => {
    const { container } = render(elemento);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.sk').length).toBeGreaterThan(1);
    semTextoDeCarregamento(container);
  });
});

describe('Fallback real durante o lazy loading', () => {
  it('troca de rota mostra skeleton (não texto) antes da página chegar', async () => {
    renderApp('/mercados', { mobile: true });

    // Primeiro frame: o chunk do Dashboard ainda não carregou
    expect(document.querySelector('.sk-area')).not.toBeNull();
    expect(document.body).not.toHaveTextContent(/carregando/i);

    // E a página de verdade substitui o skeleton de página
    await waitFor(() => expect(document.querySelector('nav.nav')).not.toBeNull(), { timeout: 3000 });
    expect(document.querySelector('.mnav')).not.toBeNull();
  });
});
