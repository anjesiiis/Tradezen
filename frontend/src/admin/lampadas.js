import { useEffect, useState } from "react";
import { API_DO_PADRAO, templatesNiveisApi, templatesOcoApi, templatesTopoDuploApi } from "./adminApi";
import { PADROES, configDoTemplate } from "./bandeira.js";
import { LINE_PAIRS_OCO, LINE_PAIRS_TOPO_DUPLO, STEPS_OCO, STEPS_TOPO_DUPLO } from "./padroesClassicos.js";

// 💡 dos templates JÁ SALVOS de um ativo, em qualquer tela de marcação.
// Cada lâmpada é clicável e abre o desenho daquele padrão — sem rótulo de
// ponto, que é como ele vai aparecer pro usuário final.

// Todas as tabelas de template, não só os padrões de continuação: quem está
// marcando um OCO também quer ver que ali já tem um topo duplo marcado.
export const APIS_DE_TEMPLATE = {
  ...API_DO_PADRAO,
  oco: templatesOcoApi,
  topo_duplo: templatesTopoDuploApi,
  niveis: templatesNiveisApi,
};

const ROTULOS = {
  ...Object.fromEntries(Object.values(PADROES).map((p) => [p.id, p.rotulo])),
  oco: "OCO",
  topo_duplo: "Topo Duplo",
  niveis: "Suporte/Resistência",
};

export function rotuloDoTipo(tipo) {
  return ROTULOS[tipo] || tipo;
}

/**
 * Lâmpadas do ticker: uma por template salvo, de qualquer padrão.
 * `gatilho` — mude esse valor pra recarregar (ex: depois de salvar).
 */
export function useLampadas(ticker, gatilho) {
  const [lampadas, setLampadas] = useState([]);

  useEffect(() => {
    let cancelado = false;
    const alvo = (ticker || "").trim().toUpperCase();

    const busca = !alvo ? Promise.resolve([]) : Promise.all(
      Object.entries(APIS_DE_TEMPLATE).map(async ([tipo, api]) => {
        try {
          const lista = await api.list();
          return (lista || [])
            .filter((t) => (t.ticker || "").toUpperCase() === alvo && t.data_p1)
            .map((t) => ({
              id: `${tipo}-${t.id}`,
              templateId: t.id,
              tipo,
              rotulo: rotuloDoTipo(tipo),
              time: Math.floor(new Date(t.data_p1).getTime() / 1000),
            }));
        } catch {
          return []; // um padrão sem tabela ainda não pode derrubar o resto
        }
      })
    );

    busca.then((listas) => {
      if (!cancelado) setLampadas(listas.flat().filter((l) => Number.isFinite(l.time)));
    });
    return () => { cancelado = true; };
  }, [ticker, gatilho]);

  return lampadas;
}

/**
 * Converte os pontos de um template salvo (índices dentro dos candles DELE)
 * para os índices do gráfico que está na tela agora.
 */
export function converterParaGraficoAtual(salvo, candlesAtuais) {
  if (!salvo?.pontos || !salvo?.candles?.length || !candlesAtuais?.length) return null;
  const tempos = candlesAtuais.map((c) => c.timestamp);

  const pontos = {};
  for (const [chave, ponto] of Object.entries(salvo.pontos)) {
    const candle = salvo.candles[ponto.i];
    if (!candle) continue;
    let melhor = 0;
    for (let i = 1; i < tempos.length; i++) {
      if (Math.abs(tempos[i] - candle.timestamp) < Math.abs(tempos[melhor] - candle.timestamp)) melhor = i;
    }
    pontos[chave] = { i: melhor, preco: ponto.preco };
  }
  return Object.keys(pontos).length ? pontos : null;
}

/**
 * Como desenhar um template salvo, conforme o padrão DELE — e não conforme
 * a tela em que se está. Sem isso, abrir a 💡 de um OCO estando na tela de
 * bandeira desenhava as linhas erradas.
 */
export function configDeDesenho(tipo, pontos) {
  if (PADROES[tipo]) return configDoTemplate(pontos, PADROES[tipo]);
  if (tipo === "oco") return { steps: STEPS_OCO, linePairs: LINE_PAIRS_OCO };
  if (tipo === "topo_duplo") return { steps: STEPS_TOPO_DUPLO, linePairs: LINE_PAIRS_TOPO_DUPLO };
  return { steps: [], linePairs: [] };
}

/**
 * Monta o desenho de um template salvo pro gráfico atual.
 * `config`: { steps, linhas?, linePairs? } — o mesmo formato que a tela usa
 * pra desenhar a marcação em andamento.
 */
export function montarDesenhoSalvo({ chave, rotulo, tipo, salvo, candlesAtuais, config }) {
  const pontos = converterParaGraficoAtual(salvo, candlesAtuais);
  if (!pontos) return null;
  config = config || configDeDesenho(tipo, salvo.pontos);

  const linhas = config.linhas
    ? config.linhas(pontos, candlesAtuais)
    : (config.linePairs || [])
        .filter(([a, b]) => pontos[a] && pontos[b])
        .map(([a, b]) => ({
          cor: "#FFD700", largura: 2, tracejada: false,
          dados: [pontos[a], pontos[b]].map((pt) => ({ i: pt.i, preco: pt.preco })),
        }));

  const cores = Object.fromEntries((config.steps || []).map((st) => [st.key, st.color]));
  return {
    chave,
    rotulo,
    linhas,
    pontos: Object.entries(pontos).map(([nome, pt]) => ({ ...pt, cor: cores[nome] })),
  };
}
