import { useMemo, useState } from "react";
import { testarModelo } from "./adminApi.js";

/**
 * LABORATÓRIO DE VALIDAÇÃO — rodar o modelo no acervo e ver onde ele erra.
 *
 * DUAS MATRIZES, e esta é a decisão mais importante da tela: o modelo foi
 * TREINADO em 85% destes mesmos templates. A matriz do acervo inteiro
 * mistura exemplo decorado com exemplo novo e sai muito melhor que a
 * realidade — na primeira medição deu 89% de acurácia contra 59% no que o
 * modelo nunca viu. Mostrar só a primeira seria entregar um número que
 * desaba no primeiro uso real. A segunda é a que vale como medida; a
 * primeira serve pra olhar os erros, porque ali há mais deles pra estudar.
 *
 * ORDENAÇÃO por confiança decrescente, como pedido: filtrando FP/FN, os
 * erros mais convictos sobem, e é ali que o modelo está mais perdido.
 *
 * O MINI-GRÁFICO desenha os PONTOS da marcação, não os candles. Os candles
 * de 212 templates passariam de 10MB na resposta; o esqueleto do padrão é
 * o que se precisa ver pra julgar "o modelo errou porque o desenho está
 * torto" — e é de graça, porque os pontos já vêm.
 */

const RESULTADOS = {
  VP: { rotulo: "Acertou: é bom e o modelo disse que é", classe: "vp", icone: "✅" },
  VN: { rotulo: "Acertou: não é bom e o modelo disse que não", classe: "vn", icone: "✅" },
  FP: { rotulo: "Errou: o modelo disse que é, e não é", classe: "fp", icone: "❌" },
  FN: { rotulo: "Errou: o modelo disse que não é, e é", classe: "fn", icone: "❌" },
};

const FILTROS = [
  { id: "todos", rotulo: "Todos", cabe: () => true },
  { id: "acertos", rotulo: "Acertos ✅", cabe: (r) => r.resultado === "VP" || r.resultado === "VN" },
  { id: "erros", rotulo: "Erros ❌", cabe: (r) => r.resultado === "FP" || r.resultado === "FN" },
  { id: "fp", rotulo: "Falso positivo", cabe: (r) => r.resultado === "FP" },
  { id: "fn", rotulo: "Falso negativo", cabe: (r) => r.resultado === "FN" },
];

const pct = (v) => (v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`);

/** O esqueleto do padrão a partir dos pontos: índice no eixo x, preço no y. */
function MiniPadrao({ pontos, classe }) {
  const lista = useMemo(() => {
    const vals = Object.values(pontos || {})
      .filter((p) => Number.isInteger(p?.i) && typeof p?.preco === "number")
      .sort((a, b) => a.i - b.i);
    return vals;
  }, [pontos]);

  if (lista.length < 2) {
    return <div className="mt-mini mt-mini-vazio">sem pontos para desenhar</div>;
  }

  const xs = lista.map((p) => p.i);
  const ys = lista.map((p) => p.preco);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const larg = 200, alt = 72, pad = 6;
  const px = (i) => pad + ((i - x0) / (x1 - x0 || 1)) * (larg - 2 * pad);
  // y invertido: no SVG o zero é em cima, e preço maior tem de ficar em cima.
  const py = (v) => alt - pad - ((v - y0) / (y1 - y0 || 1)) * (alt - 2 * pad);
  const caminho = lista.map((p, k) => `${k ? "L" : "M"}${px(p.i).toFixed(1)} ${py(p.preco).toFixed(1)}`).join(" ");

  return (
    <svg className={`mt-mini ${classe}`} viewBox={`0 0 ${larg} ${alt}`}
      role="img" aria-label={`esqueleto do padrão com ${lista.length} pontos`}>
      <path className="mt-mini-linha" d={caminho} />
      {lista.map((p, k) => (
        <circle key={k} cx={px(p.i)} cy={py(p.preco)} r="2.6" className="mt-mini-ponto" />
      ))}
    </svg>
  );
}

function Matriz({ resumo, titulo, aviso }) {
  if (!resumo || resumo.vazio) {
    return <div className="mt-matriz"><h4>{titulo}</h4><p className="mt-calmo">sem linhas</p></div>;
  }
  return (
    <div className="mt-matriz">
      <h4>{titulo}</h4>
      {aviso && <p className="mt-aviso">{aviso}</p>}
      <table>
        <thead>
          <tr><th /><th colSpan="2">MODELO</th><th /></tr>
          <tr><th /><th>Sucesso</th><th>Falha</th><th /></tr>
        </thead>
        <tbody>
          <tr>
            <th>Humano sucesso</th>
            <td className="vp">{resumo.vp}</td>
            <td className="fn">{resumo.fn}</td>
            <td className="mt-lado">recall {pct(resumo.recall)}</td>
          </tr>
          <tr>
            <th>Humano falha</th>
            <td className="fp">{resumo.fp}</td>
            <td className="vn">{resumo.vn}</td>
            <td className="mt-lado">precisão {pct(resumo.precisao)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-total">
        {resumo.total} templates · acurácia {pct(resumo.accuracy)} · F1 {pct(resumo.f1)}
        {resumo.roc_auc != null && ` · ROC AUC ${resumo.roc_auc.toFixed(3)}`}
      </p>
    </div>
  );
}

function Detalhe({ linha, aoFechar }) {
  if (!linha) return null;
  const r = RESULTADOS[linha.resultado];
  return (
    <div className="mt-modal-fundo" role="dialog" aria-modal="true"
      aria-label={`Template ${linha.template_id}`} onClick={aoFechar}>
      <div className={`mt-modal ${r.classe}`} onClick={(e) => e.stopPropagation()}>
        <header>
          <strong>#{linha.template_id} · {linha.ticker} · {linha.timeframe}</strong>
          <button type="button" onClick={aoFechar} aria-label="Fechar">✕</button>
        </header>

        <MiniPadrao pontos={linha.pontos} classe={`${r.classe} grande`} />

        <dl className="mt-modal-dados">
          <div><dt>Rótulo humano</dt><dd>{linha.rotulo_humano}</dd></div>
          <div><dt>Estrela da marcação</dt>
            <dd>{linha.qualidade === null || linha.qualidade === undefined
              ? "sem nota" : `${linha.qualidade / 2 + 1} de 5`.replace(".", ",")}</dd></div>
          <div><dt>Desfecho anotado</dt><dd>{linha.resultado_marcado || "—"}</dd></div>
          <div><dt>Confiança do modelo</dt><dd>{pct(linha.confianca_modelo)}</dd></div>
          <div><dt>Veredicto</dt><dd>{r.icone} {r.rotulo}</dd></div>
          <div><dt>Estava no treino?</dt>
            {/* Importa muito: erro em template que o modelo TREINOU é
                sinal diferente de erro em template novo. */}
            <dd>{linha.no_treino ? "sim — o modelo já viu este" : "não — exemplo novo"}</dd></div>
          <div><dt>Período</dt><dd>{linha.periodo_inicio || "—"} → {linha.periodo_fim || "—"}</dd></div>
        </dl>

        <h4>As 12 features</h4>
        <dl className="mt-features">
          {Object.entries(linha.features || {}).map(([nome, valor]) => (
            <div key={nome}><dt>{nome}</dt><dd>{valor}</dd></div>
          ))}
        </dl>

        <p className="mt-modal-nota">
          Para abrir no gráfico completo e remarcar, vá à tela de marcação do
          padrão e procure o #{linha.template_id} na lista. O gráfico dentro
          deste modal ainda não existe — ver nota na entrega.
        </p>
      </div>
    </div>
  );
}

export default function AdminModelosTeste({ padroes }) {
  const [padrao, setPadrao] = useState(padroes[0].id);
  const [saida, setSaida] = useState(null);
  const [erro, setErro] = useState(null);
  const [rodando, setRodando] = useState(false);
  const [filtro, setFiltro] = useState("erros");
  const [soNovos, setSoNovos] = useState(true);
  const [aberto, setAberto] = useState(null);

  async function rodar(forcar) {
    setRodando(true);
    setErro(null);
    try {
      setSaida(await testarModelo(padrao, { forcar }));
      setAberto(null);
    } catch (e) {
      setErro(e?.message || "o teste falhou");
      setSaida(null);
    } finally {
      setRodando(false);
    }
  }

  const visiveis = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro) || FILTROS[0];
    return (saida?.linhas || [])
      .filter((r) => (soNovos ? !r.no_treino : true))
      .filter(f.cabe);
  }, [saida, filtro, soNovos]);

  return (
    <section className="admin-card mt-bloco">
      <h2>Testar modelo</h2>

      <div className="mt-controles">
        <label>
          Alvo
          <select value={padrao} onChange={(e) => { setPadrao(e.target.value); setSaida(null); }}>
            {padroes.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
          </select>
        </label>
        <button type="button" className="mdl-treinar" disabled={rodando}
          onClick={() => rodar(false)}>
          {rodando ? "🧪 rodando…" : "🧪 Rodar Teste"}
        </button>
        {saida && (
          <button type="button" className="mt-forcar" disabled={rodando}
            onClick={() => rodar(true)}
            title="Recalcula em vez de reusar o resultado guardado">
            Forçar novo teste
          </button>
        )}
      </div>

      {erro && <p className="mdl-erro">{erro}</p>}

      {saida && (
        <>
          <p className="mt-pergunta">
            O modelo responde: <strong>{saida.pergunta}</strong>
            {saida.modelo?.versao ? ` · modelo v${saida.modelo.versao}` : ""}
            {saida.do_cache && " · resultado guardado (use Forçar para recalcular)"}
          </p>

          <div className="mt-matrizes">
            <Matriz
              resumo={saida.resumo_nao_vistos}
              titulo="Só o que o modelo nunca viu"
              aviso="É esta que vale como medida."
            />
            <Matriz
              resumo={saida.resumo}
              titulo="Acervo inteiro"
              aviso="Inclui o que o modelo treinou — sai melhor que a realidade."
            />
          </div>

          {saida.falhas_extracao?.length > 0 && (
            <details className="mt-falhas">
              <summary>
                ⚠️ {saida.falhas_extracao.length} template
                {saida.falhas_extracao.length === 1 ? "" : "s"} que não deu pra medir
              </summary>
              <ul>
                {saida.falhas_extracao.map((f) => (
                  <li key={`${f.tabela}-${f.template_id}`}>
                    <strong>#{f.template_id}</strong> {f.ticker} — {f.motivo}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-filtros" role="group" aria-label="Filtrar resultados">
            {FILTROS.map((f) => (
              <button key={f.id} type="button"
                aria-pressed={filtro === f.id}
                className={`sr-filtro${filtro === f.id ? " aceso" : ""}`}
                onClick={() => setFiltro(f.id)}>
                {f.rotulo}
              </button>
            ))}
            <label className="mt-sonovos">
              <input type="checkbox" checked={soNovos}
                onChange={(e) => setSoNovos(e.target.checked)} />
              só os que o modelo nunca viu
            </label>
          </div>

          <p className="mt-contagem">
            {visiveis.length} template{visiveis.length === 1 ? "" : "s"},
            mais confiante primeiro
          </p>

          <div className="mt-grade">
            {visiveis.map((r) => {
              const d = RESULTADOS[r.resultado];
              return (
                <article key={`${r.tabela}-${r.template_id}`} className={`mt-card ${d.classe}`}>
                  <header>#{r.template_id} · {r.ticker} · {r.timeframe}</header>
                  <MiniPadrao pontos={r.pontos} classe={d.classe} />
                  <p className="mt-veredicto">
                    👤 {r.rotulo_humano}<br />
                    🤖 {pct(r.confianca_modelo)} {d.icone}
                  </p>
                  <details>
                    <summary>Features</summary>
                    <dl className="mt-features">
                      {Object.entries(r.features || {}).map(([n, v]) => (
                        <div key={n}><dt>{n}</dt><dd>{v}</dd></div>
                      ))}
                    </dl>
                  </details>
                  <button type="button" className="mt-ver" onClick={() => setAberto(r)}>
                    Ver detalhe
                  </button>
                </article>
              );
            })}
          </div>
        </>
      )}

      <Detalhe linha={aberto} aoFechar={() => setAberto(null)} />
    </section>
  );
}
