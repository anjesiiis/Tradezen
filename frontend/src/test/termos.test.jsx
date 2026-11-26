import { screen, waitFor } from '@testing-library/react';
import { renderApp } from './helpers.jsx';
import {
  LEI_E_FORO, NAO_E_RECOMENDACAO, PLANOS, RESPONSABILIDADE, USO_ACEITAVEL,
} from '../lib/termosDeUso.js';

const TUDO = [...NAO_E_RECOMENDACAO, ...RESPONSABILIDADE, ...USO_ACEITAVEL.pode,
              ...USO_ACEITAVEL.nao_pode, ...PLANOS.map(p => p.texto), LEI_E_FORO].join(' ');

describe('Termos de Uso — cláusulas que não podem desaparecer', () => {
  it('declara que não é recomendação de investimento', () => {
    expect(TUDO).toMatch(/não é recomendação|Nada aqui é recomendação/i);
  });

  it('declara que não somos registrados na CVM', () => {
    expect(TUDO).toMatch(/CVM/);
  });

  it('declara o risco de perda total do capital', () => {
    expect(TUDO).toMatch(/perda total do capital/i);
  });

  it('NÃO promete lucro, ganho nem resultado garantido', () => {
    expect(TUDO).not.toMatch(/lucro garantid|ganho garantid|resultado garantid|rentabilidade garantid/i);
    expect(TUDO).not.toMatch(/você vai lucrar|garantimos (o )?lucro/i);
  });

  it('informa o direito de arrependimento de 7 dias do CDC', () => {
    expect(TUDO).toMatch(/7 dias/);
    expect(TUDO).toMatch(/Código de Defesa do Consumidor|artigo 49/i);
  });

  it('não afasta os direitos do consumidor', () => {
    expect(RESPONSABILIDADE.join(' ')).toMatch(/Nada nestes termos afasta os direitos/i);
  });

  it('o foro é o do domicílio do consumidor, não o nosso', () => {
    expect(LEI_E_FORO).toMatch(/domicílio do consumidor/i);
    expect(LEI_E_FORO).toMatch(/lei brasileira/i);
  });

  it('avisa que a cotação é de terceiros e pode ter atraso', async () => {
    const { DADOS_DE_MERCADO } = await import('../lib/termosDeUso.js');
    const texto = DADOS_DE_MERCADO.join(' ');
    expect(texto).toMatch(/Yahoo Finance/);
    expect(texto).toMatch(/Binance/);
    expect(texto).toMatch(/atraso/i);
  });
});

describe('Termos de Uso — a página', () => {
  it('abre em /termos sem login', async () => {
    renderApp('/termos');
    expect(await screen.findByRole('heading', { name: 'Termos de Uso', level: 1 })).toBeInTheDocument();
  });

  it('a cláusula de "não é recomendação" vem antes das outras seções', async () => {
    renderApp('/termos');
    await screen.findByRole('heading', { name: 'Termos de Uso', level: 1 });
    const secoes = [...document.querySelectorAll('h2')].map(h => h.textContent);
    expect(secoes[0]).toBe('O que o TradeZen não é');
    expect(secoes).toContain('Planos e pagamento');
    expect(secoes).toContain('Limites de responsabilidade');
  });

  it('leva pra Política de Privacidade', async () => {
    renderApp('/termos');
    await screen.findByRole('heading', { name: 'Termos de Uso', level: 1 });
    expect(document.querySelector('a[href="/privacidade"]')).not.toBeNull();
  });

  it('é achável: o rodapé da abertura linka os Termos', async () => {
    renderApp('/');
    await waitFor(() => expect(document.querySelector('.priv-rodape')).not.toBeNull());
    const rodape = document.querySelector('.priv-rodape');
    expect(rodape.querySelector('a[href="/termos"]')).not.toBeNull();
    expect(rodape.querySelector('a[href="/privacidade"]')).not.toBeNull();
  });
});
