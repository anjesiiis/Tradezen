import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PaginaDetectores from '../pages/Detectores.jsx';
import { ATIVOS_DETECTOR, EXERCICIOS, MAX_ATIVOS_FREE } from '../lib/detectores.js';

const MERCADO = ATIVOS_DETECTOR.map((a, i) => ({
  ticker: a.ticker, simbolo: a.rotulo, nome: a.nome,
  preco: 10 + i, variacao_pct: i % 2 ? -1.5 : 2.5, alta: !(i % 2), serie: [1, 2, 3],
}));

function montar(props = {}) {
  return render(
    <MemoryRouter><PaginaDetectores mercado={MERCADO} tema="dark" {...props} /></MemoryRouter>
  );
}

const ativos = () => [...document.querySelectorAll('.det-ativo')];
const cards = () => [...document.querySelectorAll('.det-card')];

describe('Detectores', () => {
  it('lista os treze ativos e os oito exercícios', () => {
    montar();

    expect(ativos()).toHaveLength(ATIVOS_DETECTOR.length);
    expect(document.querySelectorAll('.det-exercicio')).toHaveLength(EXERCICIOS.length);
    expect(screen.getByText('Detectores de Análise Técnica')).toBeInTheDocument();
  });

  it('começa vazio e avisa o que fazer', () => {
    montar();

    expect(screen.getByText('Selecione um ativo à esquerda.')).toBeInTheDocument();
    expect(cards()).toHaveLength(0);
  });

  it('clicar num ativo põe o card no centro, e clicar de novo tira', async () => {
    const user = userEvent.setup();
    montar();

    await user.click(ativos()[0]);
    expect(cards()).toHaveLength(1);
    expect(within(cards()[0]).getByText('PETR4')).toBeInTheDocument();

    await user.click(ativos()[0]);
    expect(cards()).toHaveLength(0);
  });

  it('não anuncia padrão nenhum enquanto o modelo não está treinado', async () => {
    const user = userEvent.setup();
    montar();

    await user.click(ativos()[0]);

    expect(within(cards()[0]).getByText('Detecção em treinamento')).toBeInTheDocument();
    expect(screen.queryByText(/detectado/i)).not.toBeInTheDocument();
  });

  it('no plano gratuito, para em três ativos', async () => {
    const user = userEvent.setup();
    montar({ admin: false });

    for (let i = 0; i < 4; i++) await user.click(ativos()[i]);

    expect(cards()).toHaveLength(MAX_ATIVOS_FREE);
    expect(ativos()[4]).toBeDisabled();
  });

  it('no plano gratuito, os exercícios premium ficam com cadeado', () => {
    montar({ admin: false });

    const travados = [...document.querySelectorAll('.det-exercicio.travado')];
    expect(travados).toHaveLength(EXERCICIOS.filter((e) => e.premium).length);
    expect(screen.getByText('Suporte/Resistência').closest('.det-exercicio')).not.toHaveClass('travado');
    expect(screen.getByText('Triângulo').closest('.det-exercicio')).toHaveClass('travado');
    expect(travados[0]).toHaveAttribute('title', 'Disponível no Premium');
  });

  it('como admin, nada fica travado', () => {
    montar();

    expect(document.querySelectorAll('.det-exercicio.travado')).toHaveLength(0);
  });

  it('o rodapé traz todos os ativos como miniatura', () => {
    montar();

    expect(document.querySelectorAll('.det-mini')).toHaveLength(ATIVOS_DETECTOR.length);
  });

  it('abre o exercício pela rota do padrão', () => {
    render(
      <MemoryRouter initialEntries={['/detectores/exercicio/oco']}>
        <PaginaDetectores mercado={MERCADO} tema="dark" />
      </MemoryRouter>
    );

    // a tela do exercício entra por lazy: o fallback é o que aparece primeiro
    expect(screen.getByText('Carregando exercício…')).toBeInTheDocument();
  });
});
