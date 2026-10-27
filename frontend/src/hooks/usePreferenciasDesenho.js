import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { normalizarEstilo, normalizarPreferencias } from "../lib/grafico/estiloDesenho.js";
import { carregarDoServidor, gravarLocal, lerLocal, salvarNoServidor } from "../lib/preferenciasDesenho.js";

/**
 * As preferências de desenho desta pessoa, prontas pra tela.
 *
 * Abre com o que estiver no navegador (instantâneo) e, se houver sessão,
 * troca pelo que veio do servidor. Deslogar volta pro local: é o que o
 * dono pediu — sem conta, o padrão.
 *
 * A gravação no banco espera meio segundo. Arrastar o seletor de cor
 * dispara uma mudança por pixel, e cada uma viraria um UPDATE.
 */
const ESPERA_MS = 500;

export function usePreferenciasDesenho() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(lerLocal);
  const timerRef = useRef(null);
  const userRef = useRef(null);
  userRef.current = user?.id || null;

  // Login/logout: busca o que é daquela conta. Sem conta, o local manda.
  useEffect(() => {
    let vivo = true;
    if (!user?.id) { setPrefs(lerLocal()); return () => { vivo = false; }; }
    carregarDoServidor(user.id).then((doServidor) => {
      if (!vivo || !doServidor) return;
      setPrefs(doServidor);
      gravarLocal(doServidor);
    });
    return () => { vivo = false; };
  }, [user?.id]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  /** Troca o estilo de UMA ferramenta. O resto fica como estava. */
  const definirEstilo = useCallback((ferramenta, mudanca) => {
    setPrefs((atual) => {
      const novo = {
        ...atual,
        [ferramenta]: normalizarEstilo(ferramenta, { ...atual[ferramenta], ...mudanca }),
      };
      gravarLocal(novo);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (userRef.current) salvarNoServidor(userRef.current, novo);
      }, ESPERA_MS);
      return novo;
    });
  }, []);

  /** O estilo com que um desenho novo desta ferramenta deve nascer. */
  const estiloDe = useCallback(
    (ferramenta) => normalizarEstilo(ferramenta, prefs?.[ferramenta]),
    [prefs],
  );

  return { prefs: normalizarPreferencias(prefs), definirEstilo, estiloDe };
}
