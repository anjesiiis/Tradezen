import { useCallback, useEffect, useRef, useState } from "react";
import { ROTA_DO_STATUS, statusRevisaoApi } from "./adminApi.js";
import { STATUS_PADRAO, statusDe } from "./statusRevisao.js";
import { explicarFalha } from "./diagnosticoTemplate.js";

/**
 * O status de revisão de uma lista inteira, e como mudá-lo.
 *
 * Guarda o mapa id → status num estado só: a tela desenha selo em 212
 * cards e um pedido por card seria 212 idas ao servidor pra pintar uma
 * lista.
 *
 * A mudança é OTIMISTA — o selo troca na hora e o servidor confirma
 * depois. Sem isso cada clique esperava uma ida ao Render, que dorme e
 * leva segundos pra acordar; marcar quinze marcações seguidas viraria
 * quinze esperas. Se o servidor recusar, o selo volta ao que era e a
 * mensagem diz por quê: nada fica mentindo na tela.
 */
export function useStatusRevisao(padraoId, { aoFalhar } = {}) {
  const rota = ROTA_DO_STATUS[padraoId] || null;
  const [mapa, setMapa] = useState({});
  const [carregando, setCarregando] = useState(false);
  // "Não dá pra ter status" é diferente de "nenhuma marcação tem status
  // ainda": a tela esconde os controles no primeiro caso, e no segundo
  // eles funcionam normalmente. Vem do MOTIVO que o `listar` devolve, e
  // não de o mapa estar vazio — mapa vazio é também o que uma lista nova
  // e um servidor fora do ar produzem, e os três pedem recados
  // diferentes.
  const [indisponivel, setIndisponivel] = useState(false);
  const [motivo, setMotivo] = useState(null);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);

  const recarregar = useCallback(async () => {
    if (!rota) return;
    setCarregando(true);
    try {
      const r = await statusRevisaoApi.listar(rota);
      if (!vivo.current) return;
      setMapa(r.marcacoes);
      setIndisponivel(r.indisponivel);
      setMotivo(r.motivo);
    } catch (erro) {
      // Não é falta de migration: é falha de rede, sessão vencida ou erro
      // do servidor. Esconde os controles igual, mas o recado é outro.
      if (vivo.current) {
        setIndisponivel(true);
        setMotivo(explicarFalha(erro, "o status"));
      }
    } finally {
      if (vivo.current) setCarregando(false);
    }
  }, [rota]);

  useEffect(() => { recarregar(); }, [recarregar]);

  const mudar = useCallback(async (id, status) => {
    if (!rota || id == null) return;
    const anterior = statusDe(mapa, id);
    if (anterior === status) return;        // nada a fazer, nem pedido a mandar

    setMapa((atual) => ({
      ...atual,
      [String(id)]: { ...(atual[String(id)] || {}), status },
    }));
    try {
      await statusRevisaoApi.mudar(rota, id, status);
      setIndisponivel(false);
    } catch (erro) {
      // Desfaz: deixar o selo novo numa gravação que falhou é pior que
      // não ter selo, porque a pessoa marca como revisto e segue adiante.
      if (vivo.current) {
        setMapa((atual) => ({
          ...atual,
          [String(id)]: { ...(atual[String(id)] || {}), status: anterior },
        }));
      }
      aoFalhar?.(erro);
    }
  }, [rota, mapa, aoFalhar]);

  /**
   * Registra que a marcação foi ABERTA. Não mexe em nada que já tenha
   * status: quem já decidiu "visto" ou "em andamento" não volta pra
   * "aberto" só por reabrir.
   */
  const registrarAbertura = useCallback((id) => {
    if (id == null) return;
    if (statusDe(mapa, id) !== STATUS_PADRAO) return;
    mudar(id, "aberto");
  }, [mapa, mudar]);

  return { mapa, mudar, registrarAbertura, recarregar, carregando, indisponivel, motivo, disponivel: !!rota };
}
