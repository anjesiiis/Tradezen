import PainelMarcacao from "./PainelMarcacao.jsx";
import { PADROES } from "./bandeira.js";

// Canal é marcado por toques: 2 fundos e 2 topos (um terceiro de cada
// lado é opcional). Mesma tela dos outros padrões — o seletor do topo
// permite trocar sem sair da página.
export default function AdminTemplatesCanalAlta() {
  return <PainelMarcacao padraoInicial={PADROES.canal_alta} />;
}
