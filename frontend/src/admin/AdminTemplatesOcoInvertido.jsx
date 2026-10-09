import PainelMarcacao from "./PainelMarcacao.jsx";
import { PADROES } from "./bandeira.js";

// OCO Invertido: mesma tela de marcação dos outros padrões — o que muda são os
// pontos, o desenho e as regras, que vivem em padroesExtras.js.
export default function AdminTemplatesOcoInvertido() {
  return <PainelMarcacao padraoInicial={PADROES.oco_invertido} />;
}
