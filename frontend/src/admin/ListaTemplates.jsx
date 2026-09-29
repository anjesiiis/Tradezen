// Marcações salvas em cards — um por template, com o que interessa relembrar
// depois: ticker, padrão, data do primeiro ponto e a anotação inteira (numa
// tabela ela ficava cortada). Mesma lista nas telas de todos os padrões.
export default function ListaTemplates({ templates = [], rotulo, aoVisualizar, aoEditar, aoExcluir }) {
  return (
    <section className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2>Marcados em {rotulo} ({templates.length})</h2>

      {templates.length === 0 && (
        <p style={{ color: "var(--text2)", fontSize: 13, margin: 0 }}>Nenhum template ainda.</p>
      )}

      <div className="admin-cards">
        {templates.map((t) => (
          <article key={t.id} className="admin-card-item">
            <header>
              <strong>{t.ticker}</strong>
              <span className="admin-tag">{rotulo}</span>
            </header>
            <dl>
              <div>
                <dt>P1</dt>
                {/* UTC: o candle é do dia inteiro; converter pro fuso local
                    jogaria a data um dia pra trás */}
                <dd>{t.data_p1 ? new Date(t.data_p1).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}</dd>
              </div>
              <div><dt>Timeframe</dt><dd>{t.timeframe}</dd></div>
              <div><dt>Resultado</dt><dd>{t.resultado || "—"}</dd></div>
              <div><dt>Salvo em</dt><dd>{new Date(t.criado_em).toLocaleDateString("pt-BR")}</dd></div>
            </dl>
            {t.observacao && <p className="admin-card-nota">{t.observacao}</p>}
            {/* botão de verdade, não <a> sem href: o mouse vira mãozinha, dá
                pra chegar pelo teclado e o leitor de tela anuncia como botão */}
            <footer>
              <button type="button" className="action" onClick={() => aoVisualizar(t)}>Visualizar</button>
              <button type="button" className="action" onClick={() => aoEditar(t)}>Editar</button>
              <button type="button" className="action danger" onClick={() => aoExcluir(t.id)}>Excluir</button>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
