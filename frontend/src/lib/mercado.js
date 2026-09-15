export const MKTC={"B3":"#009C3B","CRIPTO":"#F7931A","FOREX":"#3D7EFF","NASDAQ":"#9B6DFF","NYSE":"#E8B84B","COMMODITY":"#F5A623","—":"#5A7299"};
export const MERCADOS_ORDEM=["B3","CRIPTO","FOREX","NASDAQ","NYSE","COMMODITY"];


export const fmtP=v=>{
  if(!v&&v!==0)return"—";
  if(v>100000)return v.toLocaleString("pt-BR",{maximumFractionDigits:0});
  if(v>1000)  return v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
  if(v>10)    return v.toFixed(2);
  if(v>1)     return v.toFixed(3);
  return v.toFixed(4);
};
