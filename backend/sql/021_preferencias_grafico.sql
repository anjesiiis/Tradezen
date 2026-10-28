-- TradeZen — aparência do gráfico por usuário
--
-- Cor dos candles de alta e de baixa, e se o preço é visto como candle
-- ou como linha. Mora em profiles, junto de preferencias_desenho: são a
-- mesma ideia (o jeito desta pessoa ver o gráfico), e separar em tabela
-- própria só renderia um JOIN a mais pra ler duas colunas.
--
-- Guarda preferência de aparência e MAIS NADA. O TradeZen não registra o
-- que você olha, quando olha nem por quanto tempo — não há tabela de
-- eventos, de cliques ou de ativos visitados, e não é esquecimento.
--
-- Idempotente: rodar duas vezes não dá erro.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferencias_grafico JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.preferencias_grafico IS
  'Aparência do gráfico: { tipo: "candle"|"linha", cores: { alta, baixa } }';
