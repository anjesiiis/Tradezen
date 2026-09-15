import { useState } from "react";

// Logo real por ativo — cripto e ações têm empresa/moeda de verdade por trás
// (CoinGecko/Clearbit); commodity e forex não têm "logo de empresa", usam um
// símbolo (Au/Ag/$/€/£) no lugar. `cor` aqui é a cor de fallback — mostrada
// se a imagem falhar (ver IconeAtivo) ou já usada direto pros tipos "simbolo".
const ICONE_ATIVO_INFO = {
  // Cripto
  "BTC-USD":  { tipo:"img", url:"https://assets.coingecko.com/coins/images/1/small/bitcoin.png",     cor:"#F7931A" },
  "ETH-USD":  { tipo:"img", url:"https://assets.coingecko.com/coins/images/279/small/ethereum.png",  cor:"#627EEA" },
  "SOL-USD":  { tipo:"img", url:"https://assets.coingecko.com/coins/images/4128/small/solana.png",   cor:"#9945FF" },
  "BNB-USD":  { tipo:"img", url:"https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png", cor:"#F3BA2F" },
  "XRP-USD":  { tipo:"img", url:"https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png", cor:"#3A4048" },
  "ADA-USD":  { tipo:"img", url:"https://assets.coingecko.com/coins/images/975/small/cardano.png",    cor:"#0033AD" },
  "DOGE-USD": { tipo:"img", url:"https://assets.coingecko.com/coins/images/5/small/dogecoin.png",     cor:"#C2A633" },
  "AVAX-USD": { tipo:"img", url:"https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png", cor:"#E84142" },
  // Ações B3 — o Clearbit (logo.clearbit.com) saiu do ar de vez (nem o DNS
  // resolve mais, confirmado testando direto), então usa o serviço de
  // favicon do Google — não pede chave/cadastro e é estável há anos. Mesma
  // cor de fallback pras seis (identidade "ação BR" genérica; a cor de
  // marca de cada empresa só importava enquanto o quadradinho de 1 letra
  // era a única opção).
  "PETR4.SA": { tipo:"img", url:"https://www.google.com/s2/favicons?domain=petrobras.com.br&sz=128",     cor:"#003087" },
  "VALE3.SA": { tipo:"img", url:"https://www.google.com/s2/favicons?domain=vale.com&sz=128",             cor:"#003087" },
  "ITUB4.SA": { tipo:"img", url:"https://www.google.com/s2/favicons?domain=itau.com.br&sz=128",          cor:"#003087" },
  "BBDC4.SA": { tipo:"img", url:"https://www.google.com/s2/favicons?domain=bradesco.com.br&sz=128",      cor:"#003087" },
  "WEGE3.SA": { tipo:"img", url:"https://www.google.com/s2/favicons?domain=weg.net&sz=128",               cor:"#003087" },
  "MGLU3.SA": { tipo:"img", url:"https://www.google.com/s2/favicons?domain=magazineluiza.com.br&sz=128", cor:"#003087" },
  // Commodities e forex — sem logo de empresa, símbolo dentro do círculo.
  // Cor de cada uma remete à própria commodity (ouro amarelo, cobre
  // alaranjado, WTI x Brent em tons diferentes de petróleo etc.) em vez de
  // todas caírem no mesmo cinza genérico — mais fácil de reconhecer de
  // relance na lista/ticker.
  "GC=F":     { tipo:"simbolo", texto:"Au",  cor:"#FFD700" },
  "SI=F":     { tipo:"simbolo", texto:"Ag",  cor:"#C0C0C0" },
  "HG=F":     { tipo:"simbolo", texto:"Cu",  cor:"#B87333" },
  "PL=F":     { tipo:"simbolo", texto:"Pt",  cor:"#A9B4C2" },
  "CL=F":     { tipo:"simbolo", texto:"WTI", cor:"#4A4A4A" },
  "BZ=F":     { tipo:"simbolo", texto:"BRT", cor:"#1B3A57" },
  "NG=F":     { tipo:"simbolo", texto:"Gás", cor:"#4A90D9" },
  "ZC=F":     { tipo:"simbolo", texto:"Mi",  cor:"#F4C430" },
  "ZS=F":     { tipo:"simbolo", texto:"Sj",  cor:"#7CB342" },
  "KC=F":     { tipo:"simbolo", texto:"Ca",  cor:"#6F4E37" },
  "SB=F":     { tipo:"simbolo", texto:"Aç",  cor:"#E8B4B8" },
  "CT=F":     { tipo:"simbolo", texto:"Al",  cor:"#D7DEE6" },
  "USDBRL=X": { tipo:"simbolo", texto:"R$",  cor:"#009C3B" },
  "EURBRL=X": { tipo:"simbolo", texto:"€",   cor:"#003399" },
  "GBPBRL=X": { tipo:"simbolo", texto:"£",   cor:"#C8102E" },
  "EURUSD=X": { tipo:"simbolo", texto:"€",   cor:"#003399" },
  "GBPUSD=X": { tipo:"simbolo", texto:"£",   cor:"#C8102E" },
  "USDJPY=X": { tipo:"simbolo", texto:"¥",   cor:"#BC002D" },
  "USDCNY=X": { tipo:"simbolo", texto:"元",  cor:"#DE2910" },
  "GBPJPY=X": { tipo:"simbolo", texto:"£",   cor:"#C8102E" },
  "EURJPY=X": { tipo:"simbolo", texto:"€",   cor:"#003399" },
  "EURGBP=X": { tipo:"simbolo", texto:"€",   cor:"#003399" },
  "AUDUSD=X": { tipo:"simbolo", texto:"A$",  cor:"#00843D" },
  "NZDUSD=X": { tipo:"simbolo", texto:"NZ$", cor:"#00247D" },
  "USDCAD=X": { tipo:"simbolo", texto:"C$",  cor:"#FF0000" },
  "USDCHF=X": { tipo:"simbolo", texto:"Fr",  cor:"#DA291C" },
  "AUDJPY=X": { tipo:"simbolo", texto:"A$",  cor:"#00843D" },
  "CHFJPY=X": { tipo:"simbolo", texto:"Fr",  cor:"#DA291C" },
  "USDMXN=X": { tipo:"simbolo", texto:"MX$", cor:"#006341" },
  "USDINR=X": { tipo:"simbolo", texto:"₹",   cor:"#FF9933" },
  "USDKRW=X": { tipo:"simbolo", texto:"₩",   cor:"#003478" },
  "USDSGD=X": { tipo:"simbolo", texto:"S$",  cor:"#EF3340" },
  "USDHKD=X": { tipo:"simbolo", texto:"HK$", cor:"#A8112D" },
  "USDZAR=X": { tipo:"simbolo", texto:"ZAR", cor:"#007A4D" },
};

// Ícone circular de um ativo nos cards do dashboard (32x32 por padrão) —
// cripto/ação carregam o logo real; commodity/forex e qualquer ticker sem
// entrada no mapa (ou cuja imagem falhe ao carregar) caem no círculo com
// símbolo/inicial, sempre pela cor de fallback certa.
export function IconeAtivo({ ticker, simbolo, corPadrao, tamanho=32 }){
  const [erro, setErro] = useState(false);
  const info = ICONE_ATIVO_INFO[ticker];
  const cor = info?.cor || corPadrao || "#5A7299";

  if(info?.tipo==="img" && !erro){
    return (
      <img
        src={info.url}
        alt={simbolo||ticker}
        width={tamanho}
        height={tamanho}
        style={{width:tamanho,height:tamanho,borderRadius:"50%",objectFit:"cover",flexShrink:0,background:"#fff"}}
        onError={()=>setErro(true)}
      />
    );
  }

  const texto = info?.tipo==="simbolo" ? info.texto : (simbolo?.[0] || "?");
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" style={{flexShrink:0}}>
      <circle cx="16" cy="16" r="16" fill={cor+"26"}/>
      <text x="16" y="17" textAnchor="middle" dominantBaseline="middle" fill={cor} fontSize={texto.length>2?9:texto.length>1?11:14} fontWeight="800" fontFamily="var(--font-b)">{texto}</text>
    </svg>
  );
}
