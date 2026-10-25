// CSS da página de vendas (/pagina-de-vendas).
//
// Tudo é escopado em `.lp`, inclusive as variáveis de cor: esta página tem
// identidade própria (azul mais claro, fundo mais escuro que o do app) e
// NÃO pode vazar isso pro resto do site, que usa a paleta do index.css.
//
// É um template literal, como o styles/appCss.js — cuidado com crase
// dentro de comentário, que fecha a string.
export const VENDAS_CSS = `
.lp{
  --bg:#05060A; --bg-elevated:#0C0E14; --bg-card:#10131C;
  --borda:#1C2030; --borda-forte:#2A3045;
  --fg:#E8EBF2; --fg-muted:#8891A8; --fg-dim:#5A6378;
  --azul:#7BA9F0; --azul-forte:#4F8AE8; --azul-brilho:rgba(123,169,240,.15);
  --verde:#26C77B; --ambar:#F5B14C; --vermelho:#E85D5D;
  --r:10px; --r-lg:16px;
  color-scheme:dark;
  background:var(--bg); color:var(--fg);
  font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  line-height:1.6; -webkit-font-smoothing:antialiased;
  min-height:100vh; overflow-x:hidden; position:relative;
}
.lp *{box-sizing:border-box;margin:0;padding:0}
/* O index.css tem \`h1,h2{color:var(--text-h)}\`, e regra de ELEMENTO vence
   herança: sem isto os títulos daqui pegavam a cor do tema do app e, no
   claro, saíam quase pretos sobre o fundo escuro desta página — o título
   do hero ficava invisível.
   Só os títulos: incluir p/span/div aqui apagaria os tons secundários
   (.lp-sub, .lp-lead, .lp-card p) e a página inteira viraria um bloco de
   texto branco, sem hierarquia. */
.lp h1,.lp h2,.lp h3,.lp h4{color:inherit}
/* mais específico que a regra acima, pra não matar o texto em gradiente */
.lp .lp-destaque{color:transparent}
.lp-wrap{max-width:1180px;margin:0 auto;padding-inline:20px}

/* ── Tela cheia enquanto esta página está aberta ──
   O app vive num "quadro": #root tem largura fixa de 1126px, centralizado
   e com borda nas laterais (index.css). Numa tela de 1600px isso deixava
   duas faixas do fundo do html aparecendo dos lados — a barra cinza que
   quebrava o visual.
   A classe é posta no <html> pela própria página e retirada ao sair, então
   NADA disso alcança o resto do site. html e body também recebem o fundo:
   é o que cobre o espaço de "borracha" do rolar no celular, onde o fundo
   do documento aparece por baixo.
   O text-align fica como está de propósito: mexer nele moveria o texto, e
   o pedido foi só preencher o fundo. */
html.lp-tela-cheia,html.lp-tela-cheia body{background:#05060A}
html.lp-tela-cheia #root{width:100%;max-width:none;margin:0;border-inline:none}


/* ── cabeçalho ── */
.lp-header{position:sticky;top:0;z-index:50;background:rgba(5,6,10,.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--borda)}
.lp-header-inner{display:flex;align-items:center;justify-content:space-between;padding:16px 0;gap:12px}
.lp-logo{font-weight:800;font-size:22px;letter-spacing:.5px}
.lp-logo span{color:var(--azul)}
.lp-nav{display:flex;gap:12px;align-items:center}
/* :not(.lp-btn) é a correção do botão apagado: a regra de cor do menu
   tinha especificidade maior que a do botão e pintava o texto de cinza
   por cima do azul — "Começar grátis" sumia no próprio fundo. */
.lp-nav a:not(.lp-btn){color:var(--fg-muted);text-decoration:none;font-size:14px;font-weight:500}
.lp-nav a:not(.lp-btn):hover{color:var(--fg)}

/* ── botões ── */
.lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;border-radius:var(--r);font-weight:600;font-size:14px;text-decoration:none;border:none;cursor:pointer;white-space:nowrap;transition:transform .15s ease,box-shadow .2s ease,background .2s ease}
.lp-btn-primary{background:linear-gradient(135deg,var(--azul) 0%,var(--azul-forte) 100%);color:#06111F;box-shadow:0 4px 20px var(--azul-brilho)}
.lp-btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 28px rgba(123,169,240,.3)}
.lp-btn-ghost{background:transparent;color:var(--fg);border:1px solid var(--borda-forte)}
.lp-btn-ghost:hover{background:var(--bg-card);border-color:var(--azul)}
.lp-btn-lg{padding:15px 28px;font-size:15px}
.lp-btn-sm{padding:9px 18px;font-size:13px}

/* ── hero ── */
.lp-hero{padding:90px 0 70px;position:relative;overflow:hidden}
.lp-hero::before{content:'';position:absolute;top:-200px;left:50%;transform:translateX(-50%);width:800px;height:500px;background:radial-gradient(ellipse at center,var(--azul-brilho) 0%,transparent 60%);pointer-events:none}
.lp-hero-content{position:relative;z-index:1;text-align:center;max-width:820px;margin:0 auto}
.lp-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;background:var(--bg-card);border:1px solid var(--borda-forte);border-radius:100px;font-size:12px;font-weight:500;color:var(--fg-muted);margin-bottom:24px}
.lp-badge i{width:6px;height:6px;background:var(--verde);border-radius:50%;box-shadow:0 0 10px var(--verde)}
.lp-hero h1{font-size:clamp(32px,5vw,52px);font-weight:800;line-height:1.1;letter-spacing:-.02em;margin-bottom:20px;text-wrap:balance}
.lp-destaque{background:linear-gradient(135deg,var(--azul) 0%,#B8D4FF 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.lp-sub{font-size:clamp(16px,1.8vw,18px);color:var(--fg-muted);max-width:640px;margin:0 auto 36px;text-wrap:balance}
.lp-hero-ctas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.lp-trust{display:flex;gap:24px;justify-content:center;margin-top:32px;font-size:13px;color:var(--fg-dim);flex-wrap:wrap}
.lp-trust span{display:flex;align-items:center;gap:6px}
.lp-check{color:var(--verde);font-weight:700}

/* ── seções ── */
.lp section{padding-block:70px}
.lp-eyebrow{display:inline-block;font-size:12px;font-weight:600;color:var(--azul);letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px}
.lp-titulo{font-size:clamp(26px,3.5vw,36px);font-weight:700;letter-spacing:-.02em;margin-bottom:14px;line-height:1.2;text-wrap:balance}
.lp-lead{color:var(--fg-muted);font-size:16px;max-width:620px;margin-bottom:44px;text-wrap:balance}

.lp-faixa{background:var(--bg-elevated);border-top:1px solid var(--borda);border-bottom:1px solid var(--borda)}
.lp-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:24px}
.lp-card{background:var(--bg-card);border:1px solid var(--borda);border-radius:var(--r-lg);padding:24px;transition:border-color .2s ease,transform .2s ease}
.lp-card:hover{border-color:var(--borda-forte);transform:translateY(-2px)}
.lp-card-icone{width:40px;height:40px;background:var(--azul-brilho);border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;font-size:20px}
.lp-card h3{font-size:15px;font-weight:600;margin-bottom:6px}
.lp-card p{font-size:14px;color:var(--fg-muted);line-height:1.5}

/* ── premium ── */
.lp-premium{position:relative}
.lp-premium::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 20% 50%,var(--azul-brilho) 0%,transparent 50%);pointer-events:none}
.lp-premium-content{position:relative;z-index:1}
.lp-premium-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;margin-top:20px}
.lp-sinais{display:flex;flex-direction:column;gap:14px;background:var(--bg-card);border:1px solid var(--borda);border-radius:var(--r-lg);padding:24px;min-width:0}
.lp-sinal{display:flex;gap:14px;align-items:flex-start;padding:14px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--borda)}
.lp-sinal i{width:12px;height:12px;border-radius:50%;margin-top:6px;flex-shrink:0}
.lp-sinal.formando i{background:var(--ambar);box-shadow:0 0 12px var(--ambar)}
.lp-sinal.desenvolvendo i{background:#E8873A;box-shadow:0 0 12px #E8873A}
.lp-sinal.confirmado i{background:var(--verde);box-shadow:0 0 12px var(--verde)}
.lp-sinal div{min-width:0}
.lp-sinal strong{display:block;font-size:14px;font-weight:600;margin-bottom:2px}
.lp-sinal span{font-size:13px;color:var(--fg-muted)}
.lp-premium-texto h3{font-size:22px;font-weight:700;margin-bottom:14px;line-height:1.3}
.lp-premium-texto p{color:var(--fg-muted);font-size:16px;margin-bottom:20px}
.lp-lista{list-style:none;display:flex;flex-direction:column;gap:12px}
.lp-lista li{display:flex;gap:10px;font-size:15px}

/* ── números ── */
.lp-stats{background:var(--bg-elevated);border-top:1px solid var(--borda);border-bottom:1px solid var(--borda);padding-block:44px}
.lp-stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px;text-align:center}
.lp-stat-valor{font-size:clamp(28px,4vw,38px);font-weight:800;color:var(--azul);font-family:var(--mono,ui-monospace,Consolas,monospace);letter-spacing:-.02em}
.lp-stat-rotulo{font-size:13px;color:var(--fg-muted);margin-top:4px}

/* ── passos ── */
.lp-passos{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:32px;counter-reset:passo}
.lp-passo{background:var(--bg-card);border:1px solid var(--borda);border-radius:var(--r-lg);padding:28px 22px;position:relative;counter-increment:passo}
.lp-passo::before{content:counter(passo);font-family:var(--mono,ui-monospace,Consolas,monospace);font-size:48px;font-weight:700;color:var(--azul);opacity:.3;position:absolute;top:12px;right:18px;line-height:1}
.lp-passo h3{font-size:17px;font-weight:600;margin-bottom:8px;max-width:80%}
.lp-passo p{font-size:14px;color:var(--fg-muted)}

/* ── preço ── */
.lp-preco-card{max-width:480px;margin:40px auto 0;background:linear-gradient(180deg,var(--bg-card) 0%,var(--bg-elevated) 100%);border:1px solid var(--borda-forte);border-radius:var(--r-lg);padding:36px;position:relative;overflow:hidden;text-align:left}
.lp-preco-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--azul),transparent)}
.lp-preco-selo{display:inline-block;padding:4px 12px;background:var(--azul-brilho);color:var(--azul);font-size:12px;font-weight:600;border-radius:100px;margin-bottom:16px}
.lp-preco-nome{font-size:22px;font-weight:700;margin-bottom:8px}
.lp-preco-linha{display:flex;align-items:baseline;gap:6px;margin:20px 0 8px}
.lp-preco-moeda{font-size:20px;color:var(--fg-muted)}
.lp-preco-valor{font-size:48px;font-weight:800;letter-spacing:-.02em}
.lp-preco-periodo{font-size:15px;color:var(--fg-muted)}
.lp-preco-compara{font-size:13px;color:var(--fg-dim);margin-bottom:24px}
.lp-preco-itens{list-style:none;margin:24px 0;display:flex;flex-direction:column;gap:10px}
.lp-preco-itens li{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--fg)}
.lp-preco-card .lp-btn{width:100%}
.lp-preco-rodape{text-align:center;font-size:12px;color:var(--fg-dim);margin-top:14px}

/* ── aviso legal ── */
.lp-aviso{padding:24px;background:var(--bg-card);border:1px solid var(--borda);border-left:3px solid var(--ambar);border-radius:10px;display:flex;gap:14px;align-items:flex-start;max-width:820px;margin:0 auto}
.lp-aviso-icone{font-size:22px;flex-shrink:0}
.lp-aviso-texto{font-size:14px;color:var(--fg-muted);line-height:1.6}
.lp-aviso-texto strong{color:var(--fg);display:block;margin-bottom:4px}

/* ── chamada final ── */
.lp-final{text-align:center;padding-block:90px;position:relative;overflow:hidden}
.lp-final::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,var(--azul-brilho) 0%,transparent 60%);pointer-events:none}
.lp-final-content{position:relative;z-index:1}
.lp-final h2{font-size:clamp(28px,4vw,40px);font-weight:800;margin-bottom:14px;text-wrap:balance}
.lp-final p{color:var(--fg-muted);margin-bottom:28px;font-size:16px}

.lp-footer{border-top:1px solid var(--borda);padding:32px 0;text-align:center;font-size:13px;color:var(--fg-dim)}
.lp-footer .lp-logo{font-size:16px;margin-bottom:10px;display:inline-block}

/* fundo animado: atrás de tudo, sem capturar clique */
.lp-fundo{position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.35}
.lp-conteudo{position:relative;z-index:1}

@media (max-width:820px){ .lp-premium-grid{grid-template-columns:1fr;gap:32px} }
@media (max-width:720px){ .lp-passos{grid-template-columns:1fr} }
@media (max-width:560px){
  .lp-header-inner{gap:8px}
  .lp-nav{gap:8px}
  /* num celular estreito o link de preços some: os dois botões é que
     importam, e espremer três itens deixava tudo ilegível */
  .lp-nav a.lp-so-desktop{display:none}
  .lp-hero{padding:56px 0 48px}
  .lp section{padding-block:52px}
}
@media (prefers-reduced-motion:reduce){
  .lp-btn:hover,.lp-card:hover{transform:none}
}
`;
