import {
  ATUALIZADA_EM, DADOS_DE_MERCADO, DISPONIBILIDADE, EMAIL_CONTATO,
  ENCERRAR_CONTA, LEI_E_FORO, MUDANCAS, NAO_E_RECOMENDACAO, PLANOS,
  PROPRIEDADE, QUEM_PODE_USAR, RESPONSABILIDADE, USO_ACEITAVEL,
} from "../lib/termosDeUso.js";

/**
 * Termos de Uso.
 *
 * A página só desenha: o texto vem de lib/termosDeUso.js, pra o teste
 * poder afirmar que as cláusulas que não podem desaparecer continuam lá.
 *
 * Reaproveita as classes .priv-* da Política de Privacidade de propósito.
 * São o mesmo tipo de documento, e dois conjuntos de CSS quase iguais
 * sairiam de sincronia no primeiro ajuste de uma delas.
 *
 * "O que o TradeZen não é" vem ANTES de tudo, e não enterrado no meio:
 * é a cláusula que separa plataforma educacional de consultoria de
 * investimento, e quem lê os termos de um site de análise técnica está
 * procurando justamente por isso.
 */
export default function Termos() {
  return (
    <main className="priv-pagina">
      <article className="priv-corpo">
        <a className="priv-voltar" href="/">← Voltar para o início</a>

        <header>
          <h1>Termos de Uso</h1>
          <p className="priv-data">
            Atualizados em {ATUALIZADA_EM} · <span className="notranslate">TradeZen</span>
          </p>
          <p className="priv-resumo">
            Em resumo: o <span className="notranslate">TradeZen</span> ensina análise
            técnica. Não damos recomendação de investimento, não executamos ordens e
            não prometemos lucro. A decisão de operar é sua, e o risco também.
          </p>
        </header>

        <section>
          <h2>O que o TradeZen não é</h2>
          <ul className="priv-lista">
            {NAO_E_RECOMENDACAO.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section>
          <h2>Quem pode usar</h2>
          <ul className="priv-lista">
            {QUEM_PODE_USAR.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section>
          <h2>Como usar, e o que não fazer</h2>
          <h3>Pode</h3>
          <ul className="priv-lista">
            {USO_ACEITAVEL.pode.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <h3>Não pode</h3>
          <ul className="priv-lista">
            {USO_ACEITAVEL.nao_pode.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section>
          <h2>Planos e pagamento</h2>
          <div className="priv-tabela">
            {PLANOS.map((p) => (
              <div className="priv-linha priv-linha-dupla" key={p.titulo}>
                <div className="priv-dado">{p.titulo}</div>
                <div className="priv-finalidade">{p.texto}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>De onde vêm as cotações</h2>
          <ul className="priv-lista">
            {DADOS_DE_MERCADO.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section>
          <h2>Propriedade do conteúdo</h2>
          <ul className="priv-lista">
            {PROPRIEDADE.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section>
          <h2>Disponibilidade e suspensão</h2>
          <ul className="priv-lista">
            {DISPONIBILIDADE.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section>
          <h2>Limites de responsabilidade</h2>
          <ul className="priv-lista">
            {RESPONSABILIDADE.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section>
          <h2>Encerrar a conta</h2>
          <p>{ENCERRAR_CONTA}</p>
          <p className="priv-nota">
            Como tratamos os seus dados está na{" "}
            <a href="/privacidade">Política de Privacidade</a>.
          </p>
        </section>

        <section>
          <h2>Mudanças nestes termos</h2>
          <p>{MUDANCAS}</p>
        </section>

        <section>
          <h2>Lei aplicável</h2>
          <p>{LEI_E_FORO}</p>
        </section>

        <section>
          <h2>Contato</h2>
          <p>
            Qualquer dúvida sobre estes termos:{" "}
            <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
          </p>
        </section>
      </article>
    </main>
  );
}
