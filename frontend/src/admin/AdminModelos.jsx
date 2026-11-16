import { useCallback, useEffect, useState } from "react";
import AdminShell, { AdminPatternNav } from "./theme.jsx";
import { ativarModelo, fetchStatusModelos, treinarModelo } from "./adminApi.js";

/**
 * MODELOS DE ML — status do acervo e treino do Random Forest.
 *
 * Bloco 1 (quantos templates existem) e Bloco 2 (treinar). Teste manual no
 * gráfico e backtest ficam de fora de propósito.
 *
 * TELA MÍNIMA por pedido: números legíveis e botões que funcionam, sem
 * firula. O que recebeu cuidado foi o que informa decisão — a comparação
 * com o modelo anterior e o motivo de o botão estar desabilitado.
 *
 * NÃO HÁ DETECÇÃO AUTOMÁTICA aqui. O que se treina é um classificador que
 * opina sobre a forma de uma bandeira que alguém JÁ desenhou. Achar
 * bandeira no gráfico continua sendo trabalho de pessoa.
 */

const PADROES = [
  { id: "bandeira_alta", rotulo: "Bandeira de Alta" },
  { id: "bandeira_baixa", rotulo: "Bandeira de Baixa" },
];

const pct = (v) => (v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`);

const quando = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR");
};

/** "85% → 87% (+2 pontos)". Em PONTOS, não em por cento: "aumentou 2%"
 *  sobre 85% seria 86,7%, e ninguém quer essa conta na cabeça. */
function Delta({ antes, agora }) {
  if (antes === null || antes === undefined || agora === null || agora === undefined) {
    return <span className="mdl-delta">{pct(agora)}</span>;
  }
  const d = Math.round(agora * 100) - Math.round(antes * 100);
  const classe = d > 0 ? "sobe" : d < 0 ? "desce" : "igual";
  return (
    <span className={`mdl-delta ${classe}`}>
      {pct(antes)} → <strong>{pct(agora)}</strong>
      {d !== 0 && ` (${d > 0 ? "+" : ""}${d} ${Math.abs(d) === 1 ? "ponto" : "pontos"})`}
    </span>
  );
}

function Metricas({ modelo, anterior }) {
  const m = modelo?.metricas || modelo || {};
  const a = anterior?.metricas || anterior || {};
  const linhas = [
    ["Precisão", "precisao"],
    ["Recall", "recall"],
    ["F1", "f1"],
    ["Accuracy", "accuracy"],
    ["ROC AUC", "roc_auc"],
  ];
  return (
    <dl className="mdl-metricas">
      {linhas.map(([rotulo, chave]) => (
        <div key={chave}>
          <dt>{rotulo}</dt>
          <dd><Delta antes={a[chave]} agora={m[chave]} /></dd>
        </div>
      ))}
    </dl>
  );
}

function Bloco({ padrao, rotulo }) {
  const [status, setStatus] = useState(null);
  const [erro, setErro] = useState(null);
  const [treinando, setTreinando] = useState(false);
  const [recem, setRecem] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setStatus(await fetchStatusModelos(padrao));
    } catch (e) {
      setErro(e?.message || "não deu pra carregar");
    }
  }, [padrao]);

  useEffect(() => { carregar(); }, [carregar]);

  async function treinar() {
    setTreinando(true);
    setErro(null);
    try {
      const saida = await treinarModelo(padrao);
      setRecem(saida);
      await carregar();
    } catch (e) {
      setErro(e?.message || "o treino falhou");
    } finally {
      setTreinando(false);
    }
  }

  async function ativar(id) {
    try {
      await ativarModelo(id);
      await carregar();
    } catch (e) {
      setErro(e?.message || "não deu pra ativar");
    }
  }

  const modelos = status?.modelos || [];
  const ativo = status?.ativo || null;
  const ultimo = modelos[0] || null;
  const anterior = modelos[1] || null;
  const faltam = status
    ? Math.max(0, status.minimo_por_classe - Math.min(status.n_sucesso, status.n_falha))
    : 0;

  return (
    <section className="admin-card mdl-bloco">
      <h2>{rotulo}</h2>

      {erro && <p className="mdl-erro">{erro}</p>}
      {!status && !erro && <p className="mdl-calmo">Contando os templates…</p>}

      {status && (
        <>
          <div className="mdl-acervo">
            <span>Sucessos <strong>{status.n_sucesso}</strong></span>
            <span>Fracassos <strong>{status.n_falha}</strong></span>
            {!status.pode_treinar && (
              <span className="mdl-aviso">
                ⚠️ faltam {faltam} fracasso{faltam === 1 ? "" : "s"} marcado
                {faltam === 1 ? "" : "s"} (mínimo {status.minimo_por_classe} de cada)
              </span>
            )}
          </div>

          {/* OS PULADOS SÃO TRABALHO, não estatística: cada um é uma
              marcação para arrumar, e sem o id e o ticker não há como
              abrir. Por isso a lista, e não só a contagem. */}
          {status.pulados?.length > 0 && (
            <details className="mdl-pulados">
              <summary>
                {status.pulados.length} template{status.pulados.length === 1 ? "" : "s"}
                {" "}que o modelo não consegue medir
              </summary>
              <ul>
                {status.pulados.map((p) => (
                  <li key={`${p.tabela}-${p.id}`}>
                    <strong>#{p.id}</strong> {p.ticker} — {p.motivo}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <button
            type="button"
            className="mdl-treinar"
            disabled={!status.pode_treinar || treinando}
            onClick={treinar}
            title={status.pode_treinar
              ? "Treina um modelo novo com todo o acervo"
              : `Faltam ${faltam} fracassos para o treino valer algo`}
          >
            {treinando ? "🧠 treinando… pode levar alguns minutos" : "🧠 Treinar Novo Modelo"}
          </button>

          {recem?.metricas && (
            <div className="mdl-recem">
              <strong>Modelo v{recem.modelo?.versao} treinado.</strong>
              <Metricas modelo={recem.metricas} anterior={anterior} />
              {recem.modelo?.id && !recem.modelo?.ativo && (
                <button type="button" className="mdl-ativar"
                  onClick={() => ativar(recem.modelo.id)}>
                  Ativar este modelo
                </button>
              )}
            </div>
          )}

          {ultimo ? (
            <div className="mdl-ultimo">
              <h3>Último modelo treinado: v{ultimo.versao}</h3>
              <Metricas modelo={ultimo} anterior={anterior} />
              <p className="mdl-quando">Treinado em {quando(ultimo.treinado_em)}</p>
              <p className="mdl-status">
                {ultimo.ativo
                  ? "✅ ATIVO em produção"
                  : ativo
                    ? `fora de produção — o ativo é o v${ativo.versao}`
                    : "fora de produção — nenhum modelo ativo"}
              </p>
            </div>
          ) : (
            <p className="mdl-calmo">Nenhum modelo treinado ainda.</p>
          )}

          {modelos.length > 1 && (
            <table className="mdl-historico">
              <caption>Histórico — últimos 5</caption>
              <thead>
                <tr>
                  <th>v</th><th>Precisão</th><th>Recall</th><th>F1</th>
                  <th>Accuracy</th><th>Treinado</th><th />
                </tr>
              </thead>
              <tbody>
                {modelos.slice(0, 5).map((m) => (
                  <tr key={m.id} className={m.ativo ? "ativo" : ""}>
                    <td>{m.versao}</td>
                    <td>{pct(m.precisao)}</td>
                    <td>{pct(m.recall)}</td>
                    <td>{pct(m.f1)}</td>
                    <td>{pct(m.accuracy)}</td>
                    <td>{quando(m.treinado_em)}</td>
                    <td>
                      {m.ativo
                        ? <span className="mdl-tag">ativo</span>
                        : <button type="button" onClick={() => ativar(m.id)}>Ativar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}

export default function AdminModelos() {
  return (
    <AdminShell titulo="Modelos de ML">
      <AdminPatternNav active="modelos" />
      <main className="admin-main">
        <h1 className="mdl-titulo">Modelos de ML — TradeZen Admin</h1>
        <p className="mdl-sub">
          O modelo opina sobre a forma de uma bandeira que alguém já marcou.
          Quem acha a bandeira no gráfico continua sendo você.
        </p>
        {PADROES.map((p) => <Bloco key={p.id} padrao={p.id} rotulo={p.rotulo} />)}
      </main>
    </AdminShell>
  );
}
