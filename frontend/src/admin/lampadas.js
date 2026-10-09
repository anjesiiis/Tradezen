import { useEffect, useRef, useState } from "react";
import { API_DO_PADRAO, templatesNiveisApi, templatesOcoApi, templatesTopoDuploApi } from "./adminApi";
import { PADROES, configDoTemplate } from "./bandeira.js";
import { LINE_PAIRS_OCO, LINE_PAIRS_TOPO_DUPLO, STEPS_OCO, STEPS_TOPO_DUPLO } from "./padroesClassicos.js";
import { classeDoPadrao, descricaoDoPadrao, ficaAcima, iconeDoPadrao } from "../lib/iconesPadroes.js";

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

// Onde cada padrão é marcado — é pra lá que o item do sidebar leva, com
// ?modo=visualizar&id=N
export const ROTA_DO_TIPO = {
  ...Object.fromEntries(Object.values(PADROES).map((p) => [p.id, p.rota])),
  oco: "/admin/templates",
  topo_duplo: "/admin/templates/topo-duplo",
  niveis: "/admin/templates/niveis",
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
              // ícone próprio por padrão: dá pra ver de relance o que já
              // foi marcado naquele trecho e não rotular duas vezes
              icone: iconeDoPadrao(tipo),
              // cor da direção (verde alta / vermelho baixa) e espelhamento
              classe: classeDoPadrao(tipo),
              dica: descricaoDoPadrao(tipo, t.data_p1, rotuloDoTipo(tipo), t.resultado),
              // de baixa/neutro em cima do candle, de alta embaixo
              acima: ficaAcima(tipo),
              time: Math.floor(new Date(t.data_p1).getTime() / 1000),
              // o que o sidebar mostra e pra onde ele leva
              data: t.data_p1,
              resultado: t.resultado || null,
              rota: ROTA_DO_TIPO[tipo] || null,
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
 * Desenho de TODOS os padrões visíveis do ativo, pra eles aparecerem no
 * gráfico enquanto se marca o próximo — não só o emoji, as linhas.
 *
 * Quem decide o que é visível é o sidebar (o filtro de padrões), então
 * desligar um padrão lá apaga o desenho dele na hora. Cada template é
 * buscado uma vez só e fica no cache: a lista do ticker tem poucos itens,
 * e trocar o zoom não pode disparar busca nenhuma.
 */
export function useDesenhosSalvos(marcadores, candlesAtuais) {
  const [desenhos, setDesenhos] = useState([]);
  const cacheRef = useRef(new Map());
  // string com os ids visíveis: o array chega novo a cada render, e usá-lo
  // direto como dependência buscaria tudo de novo sem parar
  const chaves = marcadores.map((m) => m.id).sort().join("|");

  useEffect(() => {
    let cancelado = false;
    const nada = !marcadores.length || !candlesAtuais?.length;

    (nada ? Promise.resolve([]) : Promise.all(marcadores.map(async (m) => {
      try {
        if (!cacheRef.current.has(m.id)) {
          cacheRef.current.set(m.id, await APIS_DE_TEMPLATE[m.tipo].get(m.templateId));
        }
        return montarDesenhoSalvo({
          chave: m.id,
          rotulo: m.rotulo,
          tipo: m.tipo,
          salvo: cacheRef.current.get(m.id),
          candlesAtuais,
        });
      } catch {
        return null; // um padrão que não carregou não pode sumir com os outros
      }
    }))).then((lista) => {
      if (!cancelado) setDesenhos(lista.filter(Boolean));
    });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaves, candlesAtuais]);

  return desenhos;
}

/**
 * Converte os pontos de um template salvo (índices dentro dos candles DELE)
 * para os índices do gráfico que está na tela agora.
 */
export function converterParaGraficoAtual(salvo, candlesAtuais) {
  if (!salvo?.pontos || !salvo?.candles?.length || !candlesAtuais?.length) return null;
  const mapear = criarMapeador(salvo, candlesAtuais);

  const pontos = {};
  for (const [chave, ponto] of Object.entries(salvo.pontos)) {
    const i = mapear(ponto.i);
    if (i != null) pontos[chave] = { i, preco: ponto.preco };
  }
  return Object.keys(pontos).length ? pontos : null;
}

// O índice `i` guardado no template é dentro dos candles DELE. Aqui vira o
// índice do candle mais próximo no gráfico que está na tela.
function criarMapeador(salvo, candlesAtuais) {
  const tempos = candlesAtuais.map((c) => c.timestamp);
  return (indiceSalvo) => {
    const candle = salvo.candles[indiceSalvo];
    if (!candle) return null;
    let melhor = 0;
    for (let i = 1; i < tempos.length; i++) {
      if (Math.abs(tempos[i] - candle.timestamp) < Math.abs(tempos[melhor] - candle.timestamp)) melhor = i;
    }
    return melhor;
  };
}

/** Etiquetas de texto do template, reancoradas no gráfico atual. */
export function converterAnotacoes(salvo, candlesAtuais) {
  if (!salvo?.anotacoes?.length || !salvo?.candles?.length || !candlesAtuais?.length) return [];
  const mapear = criarMapeador(salvo, candlesAtuais);
  return salvo.anotacoes
    .map((a, n) => {
      const i = mapear(a.ancora?.i);
      return i == null ? null : { ...a, id: a.id || `salva-${n}`, ancora: { i, preco: a.ancora.preco } };
    })
    .filter(Boolean);
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
    anotacoes: converterAnotacoes(salvo, candlesAtuais),
    pontos: Object.entries(pontos).map(([nome, pt]) => ({ ...pt, cor: cores[nome] })),
  };
}
