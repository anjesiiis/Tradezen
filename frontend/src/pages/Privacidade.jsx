import {
  ARMAZENAMENTO_LOCAL, ATUALIZADA_EM, DADOS_COLETADOS, DIREITOS,
  EMAIL_PRIVACIDADE, NAO_FAZEMOS, RETENCAO, SEGURANCA,
  TRANSFERENCIA_INTERNACIONAL,
} from "../lib/politicaPrivacidade.js";

/**
 * Política de Privacidade (LGPD).
 *
 * A página só desenha: o texto vem de lib/politicaPrivacidade.js, pra o
 * teste poder afirmar que cada base legal continua declarada.
 *
 * Uma tabela "dado → finalidade → base legal" em vez de parágrafo corrido
 * porque é assim que a LGPD pede pra informação ser lida: o titular tem
 * que conseguir achar O SEU dado e ver por que ele está sendo usado. Em
 * 375px a tabela vira cartões empilhados (ver appCss).
 */
export default function Privacidade() {
  return (
    <main className="priv-pagina">
      <article className="priv-corpo">
        <a className="priv-voltar" href="/">← Voltar para o início</a>

        <header>
          <h1>Política de Privacidade</h1>
          <p className="priv-data">
            Atualizada em {ATUALIZADA_EM} · <span className="notranslate">TradeZen</span>
          </p>
          <p className="priv-resumo">
            Em resumo: guardamos o mínimo para a plataforma funcionar, não vendemos
            nem compartilhamos nada, não rastreamos o seu comportamento, e os seus
            desenhos e análises são só seus. Abaixo está o detalhe, com a base legal
            de cada uso.
          </p>
        </header>

        <section>
          <h2>O que coletamos e para quê</h2>
          <div className="priv-tabela">
            {DADOS_COLETADOS.map((d) => (
              <div className="priv-linha" key={d.dado}>
                <div className="priv-dado">{d.dado}</div>
                <div className="priv-finalidade">{d.finalidade}</div>
                <div className="priv-base">{d.base}</div>
              </div>
            ))}
          </div>
          <p className="priv-nota">
            As bases legais citadas são as da Lei 13.709/2018 (LGPD), artigo 7º.
          </p>
        </section>

        <section>
          <h2>O que não fazemos</h2>
          <ul className="priv-lista">
            {NAO_FAZEMOS.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section>
          <h2>Como protegemos</h2>
          <ul className="priv-lista">
            {SEGURANCA.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <h3>Transferência internacional</h3>
          <p>{TRANSFERENCIA_INTERNACIONAL}</p>
        </section>

        <section>
          <h2>O que fica guardado no seu navegador</h2>
          <p>{ARMAZENAMENTO_LOCAL}</p>
        </section>

        <section>
          <h2>Por quanto tempo guardamos</h2>
          <div className="priv-tabela">
            {RETENCAO.map((r) => (
              <div className="priv-linha priv-linha-dupla" key={r.quando}>
                <div className="priv-dado">{r.quando}</div>
                <div className="priv-finalidade">{r.o_que}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>Seus direitos</h2>
          <p>
            O artigo 18 da LGPD te dá os direitos abaixo. Cada um tem o caminho
            para exercer, e nenhum depende de pedir autorização a nós.
          </p>
          <div className="priv-tabela">
            {DIREITOS.map((d) => (
              <div className="priv-linha priv-linha-dupla" key={d.direito}>
                <div className="priv-dado">{d.direito}</div>
                <div className="priv-finalidade">{d.como}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>Contato</h2>
          <p>
            Para qualquer assunto de privacidade, inclusive os direitos acima:{" "}
            <a href={`mailto:${EMAIL_PRIVACIDADE}`}>{EMAIL_PRIVACIDADE}</a>.
          </p>
          <p className="priv-nota">
            O <span className="notranslate">TradeZen</span> é uma plataforma
            educacional de análise técnica. Não damos recomendação de investimento
            e não executamos ordens.
          </p>
        </section>
      </article>
    </main>
  );
}
