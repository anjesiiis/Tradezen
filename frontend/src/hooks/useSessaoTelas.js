import { useCallback, useEffect, useRef, useState } from "react";
import {
  apagarSessao, carregarSessao, normalizarSessao, salvarSessao, temAlgoAGuardar,
} from "../lib/sessaoTelas.js";

/**
 * A bancada de mesas, guardada na conta.
 *
 * Quem chama cuida da tela; este hook cuida de quando ler e quando
 * gravar. A gravação espera um segundo e meio: arrastar o seletor de
 * tempo ou fechar duas mesas seguidas dispararia um UPDATE por clique.
 */
const ESPERA_MS = 1500;

export function useSessaoTelas(userId) {
  // `null` = ainda não se sabe (a sessão do Supabase resolve depois do
  // primeiro render). A tela usa isso pra não gravar uma bancada vazia
  // por cima da guardada antes de ler o que há lá.
  const [restaurada, setRestaurada] = useState(null);
  const timerRef = useRef(null);
  const userRef = useRef(null);
  userRef.current = userId || null;

  useEffect(() => {
    let vivo = true;
    if (!userId) { setRestaurada(null); return () => { vivo = false; }; }
    carregarSessao(userId).then((sessao) => {
      if (vivo) setRestaurada(sessao || { extras: [], tempoPrincipal: null, ativa: 0 });
    });
    return () => { vivo = false; };
  }, [userId]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const guardar = useCallback((sessao) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const id = userRef.current;
      if (!id) return;
      // Bancada desmontada (uma mesa só, no tempo padrão) não deixa
      // linha: senão ela ressuscitaria no próximo F5.
      if (temAlgoAGuardar(sessao)) salvarSessao(id, normalizarSessao(sessao));
      else apagarSessao(id);
    }, ESPERA_MS);
  }, []);

  return { restaurada, guardar };
}
