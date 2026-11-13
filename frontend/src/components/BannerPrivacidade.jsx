import { useEffect, useState } from "react";

const CHAVE = "tradezen_aviso_privacidade_visto";

/**
 * Aviso de privacidade da primeira visita.
 *
 * NÃO é um banner de consentimento de cookie, e o texto não finge que é.
 * Consentimento só é exigido para armazenamento NÃO essencial — analytics,
 * publicidade, rastreamento. O TradeZen não tem nenhum dos três: o que
 * fica no navegador é a sessão de login e preferências de interface, que
 * são essenciais ao funcionamento. Pedir "aceite" para isso seria teatro,
 * e teatro de consentimento é o que a ANPD critica, não o que ela pede.
 *
 * Então este aviso INFORMA, e o botão só diz "li". Por isso também não há
 * botão de "recusar": não há nada para recusar, e oferecer um que não
 * fizesse nada seria mentir.
 *
 * O estado mora no localStorage: é preferência por navegador, não dado de
 * conta. Toda leitura e escrita em try/catch porque em aba privada, ou com
 * dados do site bloqueados, o acesso ESTOURA — e um aviso de privacidade
 * derrubando o site seria irônico demais.
 */
export default function BannerPrivacidade() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    let jaViu = true;
    try {
      jaViu = !!localStorage.getItem(CHAVE);
    } catch {
      jaViu = true;   // sem storage, não insiste: apareceria em toda navegação
    }
    setVisivel(!jaViu);
  }, []);

  function fechar() {
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {
      /* não deu pra lembrar; fecha de qualquer jeito nesta sessão */
    }
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div className="bpriv" role="region" aria-label="Aviso de privacidade">
      <p className="bpriv-texto">
        Guardamos no seu navegador apenas o necessário para o site funcionar
        (sessão de login e preferências). <strong>Não rastreamos o seu
        comportamento</strong> e não usamos analytics nem publicidade.
      </p>
      <div className="bpriv-acoes">
        <a className="bpriv-link" href="/privacidade">Saiba mais</a>
        <button type="button" className="bpriv-btn" onClick={fechar}>Entendi</button>
      </div>
    </div>
  );
}
