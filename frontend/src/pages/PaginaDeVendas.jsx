import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { VENDAS_CSS } from "../styles/vendasCss.js";

/**
 * TRADEZEN — PÁGINA DE VENDAS (/pagina-de-vendas)
 * ===============================================
 *
 * Página pública, sem header nem sidebar do app: quem chega aqui vem de
 * anúncio ou link, e qualquer navegação do produto só tira o foco da
 * oferta. Os botões levam pro cadastro e pro login reais.
 *
 * O estilo vive em styles/vendasCss.js, todo escopado em `.lp` — esta
 * página tem paleta própria e não pode vazar cor pro resto do site.
 */

const RECURSOS = [
  { icone: "🖥️", titulo: "2 telas simultâneas", texto: "Acompanhe dois ativos lado a lado no mesmo monitor — já no plano grátis." },
  { icone: "📱", titulo: "Acesso de qualquer lugar", texto: "Desktop, tablet ou celular — sua análise acompanha você." },
  { icone: "📊", titulo: "Todos os mercados", texto: "Ativos da B3, criptomoedas e principais mercados globais num só lugar." },
  { icone: "📈", titulo: "Indicadores e timeframes", texto: "Volume, RSI, médias móveis, MACD e todos os timeframes personalizáveis." },
  { icone: "✏️", titulo: "Ferramentas de desenho", texto: "Linhas, canais, Fibonacci e anotações no gráfico com um clique." },
  { icone: "⭐", titulo: "Watchlist personalizada", texto: "Salve seus favoritos e organize suas listas por estratégia." },
  { icone: "🔔", titulo: "Notificações diárias", texto: "Resumo dos seus ativos principais, todo dia no horário que escolher." },
];

const SINAIS = [
  { classe: "formando", titulo: "Padrão em formação", texto: "O setup está começando a se desenhar no gráfico." },
  { classe: "desenvolvendo", titulo: "Padrão em desenvolvimento", texto: "A estrutura está se consolidando com os critérios iniciais atendidos." },
  { classe: "confirmado", titulo: "Padrão confirmado", texto: "Todos os critérios estatísticos foram atendidos — pronto para sua análise." },
];

const NUMEROS = [
  { valor: "10.000+", rotulo: "Padrões detectados e validados" },
  { valor: "500+", rotulo: "Ativos monitorados 24/7" },
  { valor: "24h", rotulo: "Monitoramento contínuo" },
  { valor: "+1/dia", rotulo: "Nossa IA aprende todo dia" },
];

const PASSOS = [
  { titulo: "Escolha seus ativos", texto: "Monte sua watchlist com até 50 ativos entre ações da B3, criptos e índices globais." },
  { titulo: "A Machine Learning monitora 24/7", texto: "Enquanto você vive sua vida, nossa IA varre o mercado buscando padrões se formando." },
  { titulo: "Receba o alerta", texto: "Push no celular, email ou WhatsApp — na hora que o padrão aparecer, você fica sabendo." },
];

const ITENS_DO_PLANO = [
  "Tudo do plano base",
  "Detecção automática de padrões via Machine Learning",
  "4 telas simultâneas (o dobro do plano grátis) para monitorar vários ativos ao mesmo tempo",
  "Alertas em 3 estágios: formação, desenvolvimento e confirmação",
  "Notificações por push, email e WhatsApp",
  "Até 50 ativos na watchlist",
  "Suporte prioritário em português",
];

/**
 * Manchas de luz azul que vagam pelo fundo.
 *
 * Em canvas e não em CSS porque são três gradientes se movendo e
 * atravessando as bordas — com `filter: blur` o navegador repinta a tela
 * inteira a cada quadro e o celular esquenta.
 *
 * Respeita "reduzir movimento": quem pediu menos animação no sistema
 * recebe as manchas paradas, desenhadas uma vez só.
 *
 * O nome começa com `use` porque é a regra que faz o React (e o lint)
 * reconhecerem isto como hook — o resto do arquivo é em português, este
 * prefixo é exigência da ferramenta.
 */
function useFundoAnimado(ref) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let largura = 0, altura = 0, quadro = null;
    const parado = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const medir = () => {
      largura = canvas.width = window.innerWidth;
      altura = canvas.height = window.innerHeight;
    };
    medir();

    const manchas = Array.from({ length: 3 }, () => ({
      x: Math.random() * largura,
      y: Math.random() * altura,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 200 + Math.random() * 150,
      tom: 215 + Math.random() * 25,
    }));

    const desenhar = () => {
      ctx.clearRect(0, 0, largura, altura);
      for (const m of manchas) {
        if (!parado) {
          m.x += m.vx; m.y += m.vy;
          if (m.x < -m.r) m.x = largura + m.r;
          if (m.x > largura + m.r) m.x = -m.r;
          if (m.y < -m.r) m.y = altura + m.r;
          if (m.y > altura + m.r) m.y = -m.r;
        }
        const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
        grad.addColorStop(0, `hsla(${m.tom},80%,65%,.35)`);
        grad.addColorStop(0.5, `hsla(${m.tom},80%,55%,.1)`);
        grad.addColorStop(1, "hsla(220,80%,50%,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
      }
      if (!parado) quadro = requestAnimationFrame(desenhar);
    };
    desenhar();

    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("resize", medir);
      // sem isto o laço continua rodando depois de sair da página: gasta
      // bateria e segura o componente inteiro na memória
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [ref]);
}

export default function PaginaDeVendas() {
  const navigate = useNavigate();
  const fundoRef = useRef(null);
  useFundoAnimado(fundoRef);

  // Marca o documento enquanto esta página está na tela: é o que solta o
  // quadro de 1126px do #root e pinta html/body com o fundo daqui (ver
  // vendasCss). Sai na desmontagem, pra não vazar pro resto do site.
  useEffect(() => {
    document.documentElement.classList.add("lp-tela-cheia");
    return () => document.documentElement.classList.remove("lp-tela-cheia");
  }, []);

  const paraCadastro = (e) => { e.preventDefault(); navigate("/cadastro"); };
  const paraLogin = (e) => { e.preventDefault(); navigate("/login"); };

  return (
    <div className="lp">
      <style>{VENDAS_CSS}</style>
      <canvas ref={fundoRef} className="lp-fundo" aria-hidden="true" />

      <div className="lp-conteudo">
        <header className="lp-header">
          <div className="lp-wrap lp-header-inner">
            <div className="lp-logo notranslate">TRADE<span>ZEN</span></div>
            <nav className="lp-nav">
              <a href="#precos" className="lp-so-desktop">Preços</a>
              <a href="/login" onClick={paraLogin} className="lp-btn lp-btn-ghost lp-btn-sm">Entrar</a>
              <a href="/cadastro" onClick={paraCadastro} className="lp-btn lp-btn-primary lp-btn-sm">Começar grátis</a>
            </nav>
          </div>
        </header>

        <main>
          <section className="lp-hero">
            <div className="lp-wrap lp-hero-content">
              <div className="lp-badge"><i /> Monitoramento ativo em mais de 500 ativos</div>
              <h1>
                Pare de garimpar padrões manualmente.<br />
                <span className="lp-destaque">Deixe o TradeZen avisar você.</span>
              </h1>
              <p className="lp-sub">
                Plataforma completa de análise técnica com detecção automática de padrões
                via Machine Learning — baseada em milhares de ocorrências históricas reais do mercado.
              </p>
              <div className="lp-hero-ctas">
                <a href="/cadastro" onClick={paraCadastro} className="lp-btn lp-btn-primary lp-btn-lg">Começar grátis por 7 dias</a>
                <a href="#como-funciona" className="lp-btn lp-btn-ghost lp-btn-lg">Ver como funciona</a>
              </div>
              <div className="lp-trust">
                <span><span className="lp-check">✓</span> Sem cartão de crédito</span>
                <span><span className="lp-check">✓</span> Cancele quando quiser</span>
                <span><span className="lp-check">✓</span> Suporte em português</span>
              </div>
            </div>
          </section>

          <section className="lp-faixa">
            <div className="lp-wrap">
              <div className="lp-eyebrow">Plano base</div>
              <h2 className="lp-titulo">Sua central de análise técnica, do seu jeito.</h2>
              <p className="lp-lead">Tudo que você precisa pra operar com clareza, no desktop ou no celular.</p>
              <div className="lp-cards">
                {RECURSOS.map((r) => (
                  <div className="lp-card" key={r.titulo}>
                    <div className="lp-card-icone" aria-hidden="true">{r.icone}</div>
                    <h3>{r.titulo}</h3>
                    <p>{r.texto}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="lp-premium">
            <div className="lp-wrap lp-premium-content">
              <div className="lp-eyebrow">Plano premium</div>
              <h2 className="lp-titulo">A vantagem operacional que faltava no seu arsenal.</h2>
              <p className="lp-lead">
                Enquanto você está no trabalho, no trânsito ou dormindo, nossa Machine Learning
                monitora o mercado inteiro buscando padrões se formando — e te avisa em três momentos críticos.
              </p>
              <div className="lp-premium-grid">
                <div className="lp-sinais">
                  {SINAIS.map((s) => (
                    <div className={`lp-sinal ${s.classe}`} key={s.titulo}>
                      <i aria-hidden="true" />
                      <div>
                        <strong>{s.titulo}</strong>
                        <span>{s.texto}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="lp-premium-texto">
                  <h3>Chega de abrir 50 gráficos por dia procurando um setup.</h3>
                  <p>
                    O setup vem até você. Suas decisões ficam mais seletivas, mais frias — e baseadas
                    em padrões que já se repetiram milhares de vezes no histórico do mercado.
                  </p>
                  <ul className="lp-lista">
                    <li><span className="lp-check">✓</span><span>Menos tempo garimpando, mais tempo analisando</span></li>
                    <li><span className="lp-check">✓</span><span>Decisões emocionais reduzidas — opera com estatística do lado</span></li>
                    <li><span className="lp-check">✓</span><span>Ideal para swing e position trade</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="lp-stats">
            <div className="lp-wrap lp-stats-grid">
              {NUMEROS.map((n) => (
                <div key={n.rotulo}>
                  <div className="lp-stat-valor">{n.valor}</div>
                  <div className="lp-stat-rotulo">{n.rotulo}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="lp-faixa" id="como-funciona">
            <div className="lp-wrap">
              <div className="lp-eyebrow">Como funciona</div>
              <h2 className="lp-titulo">Três passos simples.</h2>
              <p className="lp-lead">Configure uma vez e deixe a plataforma trabalhar pra você.</p>
              <div className="lp-passos">
                {PASSOS.map((p) => (
                  <div className="lp-passo" key={p.titulo}>
                    <h3>{p.titulo}</h3>
                    <p>{p.texto}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="precos">
            <div className="lp-wrap" style={{ textAlign: "center" }}>
              <div className="lp-eyebrow">Preços</div>
              <h2 className="lp-titulo">Vantagem operacional por menos de R$ 2 por dia.</h2>
              <p className="lp-lead" style={{ marginInline: "auto" }}>
                Um plano simples e direto. Sem letra miúda, sem fidelidade, sem complicação.
              </p>

              <div className="lp-preco-card">
                <div className="lp-preco-selo">PREMIUM</div>
                <div className="lp-preco-nome">TradeZen Premium</div>
                <div className="lp-preco-linha">
                  <span className="lp-preco-moeda">R$</span>
                  <span className="lp-preco-valor">49</span>
                  <span className="lp-preco-periodo">,90/mês</span>
                </div>
                <div className="lp-preco-compara">
                  Equivale a menos de <strong style={{ color: "var(--fg)" }}>R$ 1,70 por dia</strong>
                </div>
                <ul className="lp-preco-itens">
                  {ITENS_DO_PLANO.map((item) => (
                    <li key={item}><span className="lp-check">✓</span>{item}</li>
                  ))}
                </ul>
                <a href="/cadastro" onClick={paraCadastro} className="lp-btn lp-btn-primary lp-btn-lg">Acesse agora</a>
                <p className="lp-preco-rodape">7 dias grátis · Cancele quando quiser · Sem fidelidade</p>
              </div>
            </div>
          </section>

          <section style={{ paddingBlock: "20px 60px" }}>
            <div className="lp-wrap">
              <div className="lp-aviso">
                <div className="lp-aviso-icone" aria-hidden="true">⚠️</div>
                <div className="lp-aviso-texto">
                  <strong>Isto NÃO é recomendação de investimento.</strong>
                  O TradeZen é uma ferramenta de análise técnica. Padrões estatisticamente
                  recorrentes aumentam a <em>probabilidade</em> de certos movimentos, mas nunca
                  garantem resultado. Decisões de compra e venda são de sua inteira responsabilidade.
                </div>
              </div>
            </div>
          </section>

          <section className="lp-final">
            <div className="lp-wrap lp-final-content">
              <h2>Pronto para operar com estatística do seu lado?</h2>
              <p>Teste grátis por 7 dias. Sem cartão. Sem compromisso.</p>
              <a href="/cadastro" onClick={paraCadastro} className="lp-btn lp-btn-primary lp-btn-lg">Começar grátis agora</a>
            </div>
          </section>
        </main>

        <footer className="lp-footer">
          <div className="lp-wrap">
            <div className="lp-logo notranslate">TRADE<span>ZEN</span></div>
            <div>© 2026 TradeZen · Todos os direitos reservados</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
