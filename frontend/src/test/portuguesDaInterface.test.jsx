import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import PopupLimiteTelas from '../components/PopupLimiteTelas.jsx';

// O padrão: linguagem clara, sem estrangeirismo desnecessário, sem
// palavra repetida na mesma frase. "TradeZen" fica intocado, e o jargão
// de mercado consolidado (Fibonacci, candle, timeframe, premium) também.

const RAIZ = resolve(process.cwd(), 'src');

function arquivosDeInterface(dir = RAIZ, saida = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      // testes e o admin ficam de fora: o admin é tela de uma pessoa só,
      // e teste não é interface
      if (nome === 'test' || nome === 'admin') continue;
      arquivosDeInterface(caminho, saida);
    } else if (nome.endsWith('.jsx') || nome.endsWith('.js')) {
      saida.push(caminho);
    }
  }
  return saida;
}

// Só o que o usuário LÊ: strings do código, fora de comentário. Nome de
// variável (previewPontoRef) e caminho de rota (/dashboard) não são
// texto de interface e não entram.
function textosVisiveis(caminho) {
  const bruto = readFileSync(caminho, 'utf8');
  const textos = [];
  for (const linha of bruto.split('\n')) {
    const corte = linha.trimStart();
    if (corte.startsWith('//') || corte.startsWith('*') || corte.startsWith('/*')) continue;
    if (/^\s*import\b/.test(linha)) continue;
    const semComentario = linha.includes('://') ? linha : linha.split('//')[0];
    for (const m of semComentario.matchAll(/["'`]([^"'`\n]{4,})["'`]/g)) {
      const t = m[1];
      if (t.startsWith('/') || t.startsWith('http')) continue;   // rota, URL
      if (!/[a-záéíóúâêôãõç]{3}/i.test(t)) continue;             // classe CSS, id
      // Identificador sem espaço (chave de localStorage, nome de classe,
      // id de evento) não é texto de interface: "tradezen-tema" é chave e
      // tem que continuar minúscula.
      if (!/\s/.test(t)) continue;
      textos.push({ arquivo: caminho.replace(RAIZ, 'src'), texto: t });
    }
  }
  return textos;
}

const TODOS = arquivosDeInterface().flatMap(textosVisiveis);

describe('Termos padronizados na interface', () => {
  it('encontrou texto pra examinar — senão o teste não prova nada', () => {
    expect(TODOS.length).toBeGreaterThan(100);
  });

  // A tela de Favoritos existe no app: chamar a mesma coisa de
  // "watchlist" num lugar e "favoritos" noutro é dois nomes pra uma coisa.
  it.each([
    ['watchlist', 'lista de favoritos'],
    ['bancada', 'telas, ou área de trabalho'],
  ])('não usa "%s" — o certo é "%s"', (termo) => {
    const ruins = TODOS.filter((t) => new RegExp(`\\b${termo}\\b`, 'i').test(t.texto));
    expect(ruins.map((r) => `${r.arquivo}: ${r.texto}`)).toEqual([]);
  });

  // "TradeZen" é o nome e é sensível a caixa: nunca traduzir, nunca
  // abreviar, nunca "Tradezen".
  it('TradeZen aparece sempre com as duas maiúsculas', () => {
    const errados = TODOS.filter((t) => /tradezen/i.test(t.texto) && !/TradeZen/.test(t.texto));
    expect(errados.map((r) => `${r.arquivo}: ${r.texto}`)).toEqual([]);
  });
});

describe('Popup de cadastro — o texto que o visitante lê', () => {
  const montar = (motivo) => render(<PopupLimiteTelas motivo={motivo} aoFechar={() => {}} />);

  it('fala em analisar, não em ver', () => {
    montar('cadastrado');
    expect(screen.getByRole('heading', { name: 'Quer analisar dois ativos lado a lado?' })).toBeInTheDocument();
  });

  it('a frase de privacidade usa "compartilhamento" e não repete "suas"', () => {
    montar('cadastrado');
    const rodape = document.querySelector('.plt-rodape').textContent.trim();

    expect(rodape).toBe('Sem compartilhamento de dados. Suas análises ficam só com você.');
    // a de antes era "Nenhum dado de comportamento é coletado. Suas
    // análises são suas." — "suas" duas vezes na mesma frase
    expect(rodape.match(/\bsuas\b/gi) || []).toHaveLength(1);
  });

  it('nenhum item da lista repete palavra entre si', () => {
    montar('cadastrado');
    const itens = [...document.querySelectorAll('.plt-ganhos li')].map((e) => e.textContent);
    // "desenhos" e "análises" podem aparecer; o que não pode é a MESMA
    // palavra carregando dois itens, que foi o caso de "favoritos"
    const palavras = itens.flatMap((i) => i.toLowerCase().match(/[a-záéíóúâêôãõç]{6,}/g) || []);
    const repetidas = palavras.filter((p, i) => palavras.indexOf(p) !== i);

    expect(repetidas).toEqual([]);
  });

  it('o popup do visitante não tem estrangeirismo', () => {
    montar('cadastrado');
    expect(document.body.textContent).not.toMatch(/watchlist|bancada|aparelho/i);
    expect(screen.getByText(/lista de favoritos/i)).toBeInTheDocument();
  });
});

describe('Popup do Premium — promete o que a página de vendas vende', () => {
  const vendas = readFileSync(resolve(RAIZ, 'pages/PaginaDeVendas.jsx'), 'utf8');

  beforeEach(() => { render(<PopupLimiteTelas motivo="upgrade" aoFechar={() => {}} />); });

  // O limite aplicado no app é 4 (decisão do dono, e é o que a página de
  // vendas anuncia). Prometer 6 aqui faria o popup vender o que o app
  // não entrega.
  it('fala em 4 telas, igual ao limite e à página de vendas', () => {
    expect(screen.getByRole('heading', { name: /até 4 ativos ao mesmo tempo/i })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/6 telas|6 ativos/);
    expect(vendas).toMatch(/4 telas simultâneas/);
  });

  it('o preço é o mesmo da página de vendas', () => {
    expect(screen.getByText('R$ 49')).toBeInTheDocument();
    expect(vendas).toMatch(/valor: "49"/);
    expect(vendas).toMatch(/periodo: ",90\/mês"/);
  });

  // Não inventar recurso: "Score de Confluência" não é vendido em lugar
  // nenhum, e popup é oferta, não rascunho.
  it('não promete recurso que não está na página de vendas', () => {
    expect(document.body.textContent).not.toMatch(/Confluência/i);
    for (const item of [...document.querySelectorAll('.plt-ganhos li')]) {
      const assunto = item.textContent.split(/[\s(]/)[0].toLowerCase();
      expect(vendas.toLowerCase(), `"${item.textContent}" não aparece na página de vendas`)
        .toContain(assunto);
    }
  });

  it('sem estrangeirismo, e Machine Learning fica (é o nome da técnica)', () => {
    expect(document.body.textContent).not.toMatch(/watchlist/i);
    expect(document.body.textContent).toMatch(/Machine Learning/);
  });
});
