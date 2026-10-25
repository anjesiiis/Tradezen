// "Mais Ativos" — a faixa de cards da tela inicial (desktop).
//
// Cada slot tem substitutos da mesma categoria: se o /mercado não trouxer
// o preferido (acontece de vez em quando), o card cai pro próximo da lista
// em vez de ficar vazio. `usados` impede que dois slots caiam no mesmo.
// Ordem pedida pelo dono: os mais procurados por quem está começando no
// Brasil vêm primeiro. Cripto desceu — é o que menos aparece na busca de
// quem chega agora.
export const MAIS_ATIVOS = [
  { ticker:"VALE3.SA", nome:"Vale",      simbolo:"VALE3", cor:"#EAB308", reservas:["CSNA3.SA","GGBR4.SA"] },
  { ticker:"PETR4.SA", nome:"Petrobras", simbolo:"PETR4", cor:"#00A650", reservas:["PETR3.SA"] },
  { ticker:"GC=F",     nome:"Ouro",      simbolo:"OURO",  cor:"#F5A623", reservas:["SI=F"] },
  { ticker:"USDBRL=X", nome:"USD/BRL",   simbolo:"USD/BRL", cor:"#9CA3AF", reservas:["EURUSD=X","GBPUSD=X"] },
  { ticker:"BTC-USD",  nome:"Bitcoin",   simbolo:"BTC",   cor:"#F7931A", reservas:["ETH-USD","SOL-USD"] },
  { ticker:"^BVSP",    nome:"Ibovespa",  simbolo:"IBOV",  cor:"#009C3B", reservas:["^GSPC","^IXIC"] },
  { ticker:"ITUB4.SA", nome:"Itaú",      simbolo:"ITUB4", cor:"#EC7000", reservas:["ITUB3.SA","BBAS3.SA"] },
  { ticker:"BBDC4.SA", nome:"Bradesco",  simbolo:"BBDC4", cor:"#CC092F", reservas:["BBDC3.SA","SANB11.SA"] },
  { ticker:"MGLU3.SA", nome:"Magazine Luiza", simbolo:"MGLU3", cor:"#0086FF", reservas:["LREN3.SA","AMER3.SA"] },
  { ticker:"WEGE3.SA", nome:"WEG",       simbolo:"WEGE3", cor:"#1E40AF", reservas:["EMBR3.SA","RAIL3.SA"] },
];

export function escolherAtivos(mercado = []) {
  const usados = new Set();
  return MAIS_ATIVOS.map((cfg) => {
    let achado = mercado.find((m) => m.ticker === cfg.ticker && !usados.has(m.ticker));
    if (!achado) {
      for (const tk of cfg.reservas) {
        achado = mercado.find((m) => m.ticker === tk && !usados.has(m.ticker));
        if (achado) break;
      }
    }
    if (achado) { usados.add(achado.ticker); return { ...achado, cor: cfg.cor }; }
    return { ticker: cfg.ticker, nome: cfg.nome, simbolo: cfg.simbolo, cor: cfg.cor, semDados: mercado.length > 0 };
  });
}
