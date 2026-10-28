import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { normalizarAparencia } from "../lib/grafico/aparencia.js";
import { carregarDoServidor, gravarLocal, lerLocal, salvarNoServidor } from "../lib/preferenciasGrafico.js";

/**
 * A aparência do gráfico desta pessoa, pronta pra tela.
 *
 * Abre com o que estiver no navegador (instantâneo) e, se houver sessão,
 * troca pelo que veio do servidor. Deslogar volta pro local — mesmo
 * desenho de usePreferenciasDesenho, de propósito: são a mesma ideia
 * aplicada a coisas diferentes.
 *
 * A gravação no banco espera meio segundo: arrastar o seletor de cor
 * dispara uma mudança por pixel, e cada uma viraria um UPDATE.
 */
const ESPERA_MS = 500;

export function usePreferenciasGrafico() {
  const { user } = useAuth();
  const [aparencia, setAparencia] = useState(lerLocal);
  const timerRef = useRef(null);
  const userRef = useRef(null);
  userRef.current = user?.id || null;

  useEffect(() => {
    let vivo = true;
    if (!user?.id) { setAparencia(lerLocal()); return () => { vivo = false; }; }
    carregarDoServidor(user.id).then((doServidor) => {
      if (!vivo || !doServidor) return;
      setAparencia(doServidor);
      gravarLocal(doServidor);
    });
    return () => { vivo = false; };
  }, [user?.id]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const definirAparencia = useCallback((mudanca) => {
    setAparencia((atual) => {
      const novo = normalizarAparencia({
        ...atual,
        ...mudanca,
        cores: { ...atual.cores, ...(mudanca.cores || {}) },
      });
      gravarLocal(novo);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (userRef.current) salvarNoServidor(userRef.current, novo);
      }, ESPERA_MS);
      return novo;
    });
  }, []);

  return { aparencia: normalizarAparencia(aparencia), definirAparencia };
}
