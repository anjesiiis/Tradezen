import { IconeAtivo } from "./IconeAtivo.jsx";
import { MKTC, fmtP } from "../lib/mercado.js";

// ── MOBILE: lista de ativos em linhas, agrupada por categoria ──
// Substitui os cards no celular: linha ocupa a largura toda, o que cabe
// mais informação por tela e fica mais fácil de escanear com o polegar.
// A ordem das seções é fixa (índices → ações → cripto, o que a maioria
// abre primeiro); o que sobrar de outras categorias entra depois, com o
// próprio rótulo, pra nenhum ativo simplesmente sumir da lista.
const MLISTA_SECOES = [
  { rotulo:"Índices", mercados:["INDICE"] },
  { rotulo:"Ações",   mercados:["B3","NASDAQ","NYSE"] },
  { rotulo:"Cripto",  mercados:["CRIPTO"] },
  { rotulo:"Moedas",  mercados:["FOREX"] },
  { rotulo:"Commodities", mercados:["COMMODITY"] },
];

export function ListaAtivosMobile({ mercado, abrirAtivo }){
  const usados = new Set();
  const grupos = MLISTA_SECOES.map(s=>{
    const ativos = mercado.filter(a=>s.mercados.includes(a.mercado));
    ativos.forEach(a=>usados.add(a.ticker));
    return { rotulo:s.rotulo, ativos };
  }).filter(g=>g.ativos.length>0);

  const resto = mercado.filter(a=>!usados.has(a.ticker));
  if(resto.length) grupos.push({ rotulo:"Outros", ativos:resto });

  return (
    <>
      {grupos.map(g=>(
        <div key={g.rotulo}>
          <div className="mlista-secao">{g.rotulo}</div>
          <div className="mlista">
            {g.ativos.map(a=>(
              <div key={a.ticker} className="mlista-item" onClick={()=>abrirAtivo(a)}>
                <IconeAtivo ticker={a.ticker} simbolo={a.simbolo} corPadrao={MKTC[a.mercado]} tamanho={30}/>
                <span className="mlista-txt">
                  <span className="mlista-tk">{a.simbolo}</span>
                  <span className="mlista-nm">{a.nome}</span>
                </span>
                <span className="mlista-dir">
                  <span className="mlista-pr">{fmtP(a.preco)}</span>
                  <span className="mlista-var" style={{color:a.alta?"var(--up)":"var(--down)"}}>
                    {a.alta?"▲":"▼"} {Math.abs(a.variacao_pct||0).toFixed(2)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
