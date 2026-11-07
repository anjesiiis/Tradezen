import { useCallback, useEffect, useRef, useState } from "react";
import { ROTA_DO_STATUS, qualidadeApi } from "./adminApi.js";
import { qualidadeDe } from "./qualidade.js";
import { explicarFalha } from "./diagnosticoTemplate.js";

/**
 * A qualidade de uma lista inteira, e como mudá-la.
 *
 * Mesma forma do useStatusRevisao, e de propósito: um mapa id → nota num
 * pedido só (um por card seriam 212 idas pra pintar uma lista) e mudança
 * OTIMISTA, porque o Render dorme e esperar cada clique viraria segundos
 * por avaliação. Se o servidor recusar, a nota volta ao que era e a
 * mensagem diz por quê — nada fica mentindo na tela.
 *
 * Reusa ROTA_DO_STATUS: a rota é a mesma palavra nas duas features
 * (`bandeira-alta`, `topo-duplo`...), e uma segunda lista com os mesmos
 * 21 nomes só serviria pra sair de sincronia.
 */
export function useQualidade(padraoId, { aoFalhar } = {}) {
  const rota = ROTA_DO_STATUS[padraoId] || null;
  const [mapa, setMapa] = useState({});
  const [indisponivel, setIndisponivel] = useState(false);
  const [motivo, setMotivo] = useState(null);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);

  const recarregar = useCallback(async () => {
    if (!rota) return;
    try {
      const r = await qualidadeApi.listar(rota);
      if (!vivo.current) return;
      setMapa(r.marcacoes);
      setIndisponivel(r.indisponivel);
      setMotivo(r.motivo);
    } catch (erro) {
      if (vivo.current) {
        setIndisponivel(true);
        setMotivo(explicarFalha(erro, "a qualidade"));
      }
    }
  }, [rota]);

  useEffect(() => { recarregar(); }, [recarregar]);

  const mudar = useCallback(async (id, qualidade) => {
    if (!rota || id == null) return;
    const anterior = qualidadeDe(mapa, id);
    if (anterior === qualidade) return;

    setMapa((atual) => ({
      ...atual,
      [String(id)]: { ...(atual[String(id)] || {}), qualidade },
    }));
    try {
      await qualidadeApi.mudar(rota, id, qualidade);
      setIndisponivel(false);
    } catch (erro) {
      // Desfaz: deixar a nota nova numa gravação que falhou é pior que
      // não ter nota, porque a pessoa avalia e segue adiante.
      if (vivo.current) {
        setMapa((atual) => ({
          ...atual,
          [String(id)]: { ...(atual[String(id)] || {}), qualidade: anterior },
        }));
      }
      aoFalhar?.(erro);
    }
  }, [rota, mapa, aoFalhar]);

  return { mapa, mudar, recarregar, indisponivel, motivo, disponivel: !!rota };
}
