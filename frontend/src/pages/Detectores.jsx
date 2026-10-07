import { lazy, Suspense, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MiniLine } from "../components/MiniLine.jsx";
import { IconeAtivo } from "../components/IconeAtivo.jsx";
import { fmtP } from "../lib/mercado.js";
import { ATIVOS_DETECTOR, EXERCICIOS, MAX_ATIVOS_FREE } from "../lib/detectores.js";

const PaginaExercicio = lazy(() => import("./Exercicio.jsx"));

// Tela de Detectores — só desktop (abaixo de 1024px o CSS troca por um
// aviso). Três colunas: ativos à esquerda, gráficos no meio, exercícios à
// direita.
export default function PaginaDetectores({ mercado = [], tema, admin }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [escolhidos, setEscolhidos] = useState([]);

  // Enquanto o plano não existe de verdade, tudo aberto. Trocar o padrão
  // pra `false` (ou passar admin={false}) mostra a tela como o usuário
  // free vai ver: cadeado nos premium e três ativos por vez.
  const isAdmin = admin ?? true;

  // /detectores/exercicio/:padrao
  const exercicio = pathname.startsWith("/detectores/exercicio/")
    ? decodeURIComponent(pathname.split("/detectores/exercicio/")[1] || "")
    : null;

  if (exercicio) {
    return (
      <Suspense fallback={<div className="det-vazio">Carregando exercício…</div>}>
        <PaginaExercicio padraoId={exercicio} mercado={mercado} tema={tema} />
      </Suspense>
    );
  }

  const dadosDe = (ticker) => mercado.find((m) => m.ticker === ticker);

  function alternar(ativo) {
    setEscolhidos((antes) => {
      if (antes.includes(ativo.ticker)) return antes.filter((t) => t !== ativo.ticker);
      const limite = isAdmin ? ATIVOS_DETECTOR.length : MAX_ATIVOS_FREE;
      if (antes.length >= limite) return antes;   // free: três por vez
      return [...antes, ativo.ticker];
    });
  }

  const noLimite = !isAdmin && escolhidos.length >= MAX_ATIVOS_FREE;

  return (
    <>
      <div className="det-so-desktop">
        Os detectores são uma tela de desktop — abra num computador para usar.
      </div>

      <div className="det">
        {/* ── ESQUERDA: lista de ativos ── */}
        <aside className="det-col det-ativos">
          <h1 className="det-titulo">Detectores de Análise Técnica</h1>
          <p className="det-sub">
            {isAdmin ? "Escolha os ativos para acompanhar." : `Até ${MAX_ATIVOS_FREE} ativos ao mesmo tempo no plano gratuito.`}
          </p>

          <div className="det-lista">
            {ATIVOS_DETECTOR.map((a) => {
              const dados = dadosDe(a.ticker);
              const ligado = escolhidos.includes(a.ticker);
              const bloqueado = !ligado && noLimite;
              return (
                <button
                  key={a.ticker}
                  type="button"
                  className={`det-ativo${ligado ? " ligado" : ""}`}
                  disabled={bloqueado}
                  title={bloqueado ? `O plano gratuito acompanha ${MAX_ATIVOS_FREE} ativos por vez` : a.nome}
                  onClick={() => alternar(a)}
                >
                  <IconeAtivo ticker={a.ticker} simbolo={a.rotulo} corPadrao={a.cor} />
                  <span className="det-ativo-nome">
                    <strong>{a.rotulo}</strong>
                    <span>{a.nome}</span>
                  </span>
                  {dados && (
                    <span className={`det-ativo-var ${dados.alta ? "alta" : "baixa"}`}>
                      {dados.alta ? "▲" : "▼"} {Math.abs(dados.variacao_pct || 0).toFixed(2)}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={`det-btn-todos${isAdmin ? "" : " travado"}`}
            title={isAdmin ? "Ver todos os padrões" : "Plano Premium"}
            onClick={() => isAdmin && navigate("/detectores/exercicio/oco")}
          >
            Ver todos os padrões {isAdmin ? "" : "🔒"}
          </button>
        </aside>

        {/* ── CENTRO: o que foi escolhido ── */}
        <section className="det-col det-centro">
          {escolhidos.length === 0 ? (
            <div className="det-vazio">Selecione um ativo à esquerda.</div>
          ) : (
            <div className="det-cards">
              {escolhidos.map((ticker) => {
                const cfg = ATIVOS_DETECTOR.find((a) => a.ticker === ticker);
                const dados = dadosDe(ticker);
                return (
                  <article key={ticker} className="card det-card">
                    <header>
                      <IconeAtivo ticker={ticker} simbolo={cfg.rotulo} corPadrao={cfg.cor} />
                      <span className="det-card-nome">
                        <strong>{cfg.rotulo}</strong>
                        <span>{cfg.nome}</span>
                      </span>
                      {dados && (
                        <span className="det-card-preco">
                          {fmtP(dados.preco)}
                          <span className={dados.alta ? "alta" : "baixa"}>
                            {dados.alta ? "▲" : "▼"} {Math.abs(dados.variacao_pct || 0).toFixed(2)}%
                          </span>
                        </span>
                      )}
                      {/* Sem padrão anunciado: o modelo ainda está sendo
                          treinado com os templates do admin. Dizer "OCO
                          detectado" agora seria inventar sinal. */}
                      <span className="det-badge">Detecção em treinamento</span>
                      <button type="button" className="det-card-x" title="Tirar da lista" onClick={() => alternar(cfg)}>✕</button>
                    </header>
                    <div className="det-card-linha">
                      <MiniLine data={dados?.serie || []} color={dados?.alta ? "#00D68F" : "#FF4560"} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="det-miniaturas">
            {ATIVOS_DETECTOR.map((a) => {
              const dados = dadosDe(a.ticker);
              return (
                <button
                  key={a.ticker}
                  type="button"
                  className={`det-mini${escolhidos.includes(a.ticker) ? " ligado" : ""}`}
                  onClick={() => alternar(a)}
                  title={a.nome}
                >
                  <strong>{a.rotulo}</strong>
                  <span className={dados?.alta ? "alta" : "baixa"}>
                    {dados ? `${dados.alta ? "▲" : "▼"} ${Math.abs(dados.variacao_pct || 0).toFixed(2)}%` : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── DIREITA: exercícios ── */}
        <aside className="det-col det-exercicios">
          <h2 className="det-titulo">Exercícios</h2>
          <div className="det-grade">
            {EXERCICIOS.map((e) => {
              const travado = e.premium && !isAdmin;
              return (
                <button
                  key={e.id}
                  type="button"
                  className={`det-exercicio${travado ? " travado" : ""}`}
                  title={travado ? "Disponível no Premium" : `Praticar ${e.nome}`}
                  onClick={() => !travado && navigate(`/detectores/exercicio/${e.id}`)}
                >
                  <span className="det-exercicio-nome">{e.nome}</span>
                  {travado && <span className="det-cadeado" aria-label="Disponível no Premium">🔒</span>}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </>
  );
}
