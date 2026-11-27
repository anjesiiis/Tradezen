import { screen, waitFor, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderApp } from './helpers.jsx';

const ler = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('/email-confirmado', () => {
  it('abre sem login e confirma o cadastro com palavras', async () => {
    renderApp('/email-confirmado');
    expect(await screen.findByRole('heading', { name: 'Email confirmado!', level: 1 }))
      .toBeInTheDocument();
    expect(screen.getByText(/foi\s*confirmado com sucesso/)).toBeInTheDocument();
  });

  it('tem o botão que leva pra plataforma', async () => {
    renderApp('/email-confirmado');
    await screen.findByRole('heading', { name: 'Email confirmado!' });
    // Sem sessão no mock, o botão espera — mas existe e diz o que vai fazer
    const botao = await waitFor(() => {
      const b = document.querySelector('.auth-btn');
      expect(b).not.toBeNull();
      return b;
    });
    expect(botao.textContent).toMatch(/Acessar plataforma|Preparando seu acesso/);
  });

  // O MESMO link que traz o token traz o erro quando expira. Uma página
  // que só desenha "Email confirmado!" mentiria pra quem demorou dois
  // dias pra abrir o email — e é exatamente quem precisa de instrução.
  it('link expirado NÃO diz que confirmou', async () => {
    renderApp('/email-confirmado#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    expect(await screen.findByRole('heading', { name: /Este link não vale mais/ }))
      .toBeInTheDocument();
    expect(screen.queryByText('Email confirmado!')).not.toBeInTheDocument();
    expect(screen.getByText(/Email link is invalid or has expired/)).toBeInTheDocument();
  });

  it('do link expirado dá pra voltar pro cadastro', async () => {
    renderApp('/email-confirmado#error_description=Email+link+is+invalid');
    const botao = await screen.findByRole('button', { name: /Fazer o cadastro de novo/ });
    fireEvent.click(botao);
    await waitFor(() => expect(window.location.pathname).toBe('/cadastro'));
  });

  // Sem esta exclusão, o retorno no formato "?code=..." cairia no painel
  // administrativo: a última linha de retornoDeAuthAdmin trata qualquer
  // ?code= como retorno de admin.
  it('o retorno com ?code= NÃO cai no painel admin', async () => {
    renderApp('/email-confirmado?code=abc123');
    expect(await screen.findByRole('heading', { name: 'Email confirmado!' })).toBeInTheDocument();
    expect(localStorage.getItem('admin_token')).not.toBe('abc123');
  });
});

// Testes de código-fonte: travam as ligações que uma refatoração
// romperia em silêncio, sem aparecer em nenhuma tela.
describe('as três pontas ficaram ligadas', () => {
  it('o cadastro manda o link pra /email-confirmado', () => {
    const fonte = ler('src/auth/Cadastro.jsx');
    expect(fonte).toMatch(/emailRedirectTo:\s*`\$\{window\.location\.origin\}\/email-confirmado`/);
  });

  it('a rota existe e usa lazy, como as outras públicas', () => {
    const fonte = ler('src/App.jsx');
    expect(fonte).toMatch(/const EmailConfirmado = lazy\(\(\) => import\("\.\/pages\/EmailConfirmado\.jsx"\)\)/);
    expect(fonte).toMatch(/pathname === "\/email-confirmado"\) return <EmailConfirmado\/>/);
  });

  it('a página usa o verde do projeto, não um hex solto', () => {
    const fonte = ler('src/pages/EmailConfirmado.jsx');
    expect(fonte).toMatch(/var\(--up\)/);
    // nenhuma cor inventada: o CLAUDE.md proíbe hex fora do design system
    expect(fonte).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it('/auth/callback continua existindo pra quem tem link antigo', () => {
    const fonte = ler('src/App.jsx');
    expect(fonte).toMatch(/pathname === "\/auth\/callback"\) return <AuthCallback\/>/);
  });
});
